//! GPU theme-transition engine for isui.ren/Bahnhof.
//!
//! Two scene snapshots (from / to) are uploaded as textures once; every
//! frame the fragment shader performs, per pixel:
//!
//!   - radial reveal around the orb (inside -> `to`, outside -> `from`)
//!   - a wobbled water rim: noise-displaced sampling coordinates inside
//!     a band around the wavefront, so text bends through the arc like
//!     light through water instead of flipping at a hard line
//!   - convex-lens magnification across the rim
//!   - a soft rim highlight
//!
//! The CPU side only advances one float (`t`) per frame; everything else
//! lives in the shader. That is what buys full refresh rate on weak
//! machines.

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

const VERT_SRC: &str = r#"#version 300 es
precision highp float;
const vec2 verts[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
void main() { gl_Position = vec4(verts[gl_VertexID], 0.0, 1.0); }
"#;

const FRAG_SRC: &str = r#"#version 300 es
precision highp float;

uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform vec2  uRes;      // canvas size in px
uniform vec2  uOrb;      // orb center in px, y-down
uniform float uR;        // reveal radius px
uniform float uBand;     // water rim width px
uniform float uTime;     // seconds, for shimmer drift

out vec4 fragColor;

// cheap value noise, two octaves - enough wobble for a water rim
float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float water(vec2 p) {
    return noise(p) * 0.65 + noise(p * 2.7 + 13.1) * 0.35;
}

void main() {
    // DOM snapshots are y-down; flip once here
    vec2 frag = gl_FragCoord.xy;
    vec2 uv = vec2(frag.x / uRes.x, 1.0 - frag.y / uRes.y);
    vec2 orbUv = vec2(uOrb.x / uRes.x, 1.0 - uOrb.y / uRes.y);

    vec2 delta = uv - orbUv;
    delta.x *= uRes.x / uRes.y;             // work in isotropic space
    float dist = length(delta) ;
    vec2 dir = dist > 0.0001 ? delta / dist : vec2(0.0);

    // wobbled waterline: the rim itself breathes with noise
    float wob = (water(uv * 9.0 + vec2(uTime * 0.55, -uTime * 0.35)) - 0.5)
              * uBand * 0.9;
    float rim = uR + wob;

    // convex-lens refraction across the band: sampling coords are pulled
    // toward the lens center then pushed back - text swells through it
    float bandT = 1.0 - smoothstep(rim, rim + uBand, dist);
    float lensK = 1.0 - 0.10 * bandT * bandT;
    vec2 refr = orbUv + (uv - orbUv) / lensK;
    refr += dir * (water(uv * 14.0 - uTime * 0.8) - 0.5) * (uBand / uRes.y) * bandT * 1.6;

    vec3 toCol   = texture(uTo,   vec2(refr.x, refr.y)).rgb;
    vec3 fromCol = texture(uFrom, vec2(uv.x + dir.x * bandT * (water(uv*11.0+uTime*0.6)-0.5) * (uBand/uRes.y), uv.y)).rgb;

    float outside = smoothstep(rim - 1.5, rim + 1.5, dist); // 0 inside, 1 outside
    vec3 col = mix(toCol, fromCol, outside);

    // rim highlight: thin bright crest right on the waterline
    float crest = exp(-pow((dist - rim) / (uBand * 0.22), 2.0));
    col += vec3(0.45, 0.60, 0.95) * crest * 0.30;

    // subtle inner shimmer so freshly revealed pixels feel wet for a beat
    float wet = (1.0 - smoothstep(0.0, uBand * 1.4, abs(dist - rim))) * bandT;
    col += (water(uv * 20.0 + uTime) - 0.5) * 0.05 * wet;

    fragColor = vec4(col, 1.0);
}
"#;

struct Engine {
    gl: web_sys::WebGl2RenderingContext,
    program: web_sys::WebGlProgram,
    uni_from: Option<web_sys::WebGlUniformLocation>,
    uni_to: Option<web_sys::WebGlUniformLocation>,
    uni_res: Option<web_sys::WebGlUniformLocation>,
    uni_orb: Option<web_sys::WebGlUniformLocation>,
    uni_r: Option<web_sys::WebGlUniformLocation>,
    uni_band: Option<web_sys::WebGlUniformLocation>,
    uni_time: Option<web_sys::WebGlUniformLocation>,
}

fn compile(gl: &web_sys::WebGl2RenderingContext, kind: u32, src: &str) -> Result<web_sys::WebGlShader, JsValue> {
    let shader = gl.create_shader(kind).ok_or_else(|| JsValue::from_str("create_shader failed"))?;
    gl.shader_source(&shader, src);
    gl.compile_shader(&shader);
    let ok = gl
        .get_shader_parameter(&shader, web_sys::WebGl2RenderingContext::COMPILE_STATUS)
        .as_bool()
        .expect("COMPILE_STATUS should be a bool");
    if ok {
        Ok(shader)
    } else {
        Err(JsValue::from_str(&format!(
            "shader compile error: {}",
            gl.get_shader_info_log(&shader).unwrap_or_default()
        )))
    }
}

impl Engine {
    fn new(canvas: &web_sys::HtmlCanvasElement) -> Result<Engine, JsValue> {
        let gl = canvas
            .get_context("webgl2")?
            .ok_or_else(|| JsValue::from_str("webgl2 unavailable"))?
            .dyn_into::<web_sys::WebGl2RenderingContext>()?;

        let vs = compile(&gl, web_sys::WebGl2RenderingContext::VERTEX_SHADER, VERT_SRC)?;
        let fs = compile(&gl, web_sys::WebGl2RenderingContext::FRAGMENT_SHADER, FRAG_SRC)?;
        let program = gl.create_program().ok_or_else(|| JsValue::from_str("create_program failed"))?;
        gl.attach_shader(&program, &vs);
        gl.attach_shader(&program, &fs);
        gl.link_program(&program);
        let linked = gl
            .get_program_parameter(&program, web_sys::WebGl2RenderingContext::LINK_STATUS)
            .as_bool()
            .expect("LINK_STATUS should be a bool");
        if !linked {
            return Err(JsValue::from_str(&format!(
                "program link error: {}",
                gl.get_program_info_log(&program).unwrap_or_default()
            )));
        }
        gl.use_program(Some(&program));

        // attributeless fullscreen triangle: no VBO needed for gl_VertexID
        let vao = gl.create_vertex_array();
        gl.bind_vertex_array(vao.as_ref());

        Ok(Engine {
            uni_from: gl.get_uniform_location(&program, "uFrom"),
            uni_to: gl.get_uniform_location(&program, "uTo"),
            uni_res: gl.get_uniform_location(&program, "uRes"),
            uni_orb: gl.get_uniform_location(&program, "uOrb"),
            uni_r: gl.get_uniform_location(&program, "uR"),
            uni_band: gl.get_uniform_location(&program, "uBand"),
            uni_time: gl.get_uniform_location(&program, "uTime"),
            gl,
            program,
        })
    }

    fn upload_texture(&self, unit: u32, source: &web_sys::HtmlCanvasElement) -> Result<(), JsValue> {
        let tex = self.gl.create_texture().ok_or_else(|| JsValue::from_str("create_texture failed"))?;
        self.gl.active_texture(web_sys::WebGl2RenderingContext::TEXTURE0 + unit);
        self.gl.bind_texture(web_sys::WebGl2RenderingContext::TEXTURE_2D, Some(&tex));
        self.gl.tex_parameteri(
            web_sys::WebGl2RenderingContext::TEXTURE_2D,
            web_sys::WebGl2RenderingContext::TEXTURE_MIN_FILTER,
            web_sys::WebGl2RenderingContext::LINEAR as i32,
        );
        self.gl.tex_parameteri(
            web_sys::WebGl2RenderingContext::TEXTURE_2D,
            web_sys::WebGl2RenderingContext::TEXTURE_MAG_FILTER,
            web_sys::WebGl2RenderingContext::LINEAR as i32,
        );
        self.gl.tex_parameteri(
            web_sys::WebGl2RenderingContext::TEXTURE_2D,
            web_sys::WebGl2RenderingContext::TEXTURE_WRAP_S,
            web_sys::WebGl2RenderingContext::CLAMP_TO_EDGE as i32,
        );
        self.gl.tex_parameteri(
            web_sys::WebGl2RenderingContext::TEXTURE_2D,
            web_sys::WebGl2RenderingContext::TEXTURE_WRAP_T,
            web_sys::WebGl2RenderingContext::CLAMP_TO_EDGE as i32,
        );
        self.gl
            .tex_image_2d_with_i32_and_i32_and_i32_and_format_and_type_and_html_canvas_element(
                web_sys::WebGl2RenderingContext::TEXTURE_2D,
                0,
                web_sys::WebGl2RenderingContext::RGBA as i32,
                source.width() as i32,
                source.height() as i32,
                0,
                web_sys::WebGl2RenderingContext::RGBA,
                web_sys::WebGl2RenderingContext::UNSIGNED_BYTE,
                source,
            )?;
        Ok(())
    }
}

/// Handle handed back to JS: keep it alive for the duration of one theme
/// switch, call [`WaveEngine::frame`] each animation tick, then `drop()` it.
#[wasm_bindgen]
pub struct WaveEngine {
    engine: Engine,
    width: f64,
    height: f64,
}

#[wasm_bindgen]
impl WaveEngine {
    /// Prepares GL state on the given canvas and uploads both snapshots.
    /// Both snapshot sources must be plain canvases (the JS side
    /// rasterizes its scene snapshots into canvases before calling).
    pub fn new(
        canvas: web_sys::HtmlCanvasElement,
        from_source: &web_sys::HtmlCanvasElement,
        to_source: &web_sys::HtmlCanvasElement,
        orb_x: f64,
        orb_y: f64,
        band_px: f32,
    ) -> Result<WaveEngine, JsValue> {
        let width = canvas.client_width() as f64;
        let height = canvas.client_height() as f64;
        canvas.set_width(width as u32);
        canvas.set_height(height as u32);

        let engine = Engine::new(&canvas)?;
        engine.upload_texture(0, from_source)?;
        engine.upload_texture(1, to_source)?;
        if let Some(loc) = &engine.uni_from {
            engine.gl.uniform1i(Some(loc), 0);
        }
        if let Some(loc) = &engine.uni_to {
            engine.gl.uniform1i(Some(loc), 1);
        }
        if let Some(loc) = &engine.uni_res {
            engine.gl.uniform2f(Some(loc), width as f32, height as f32);
        }
        if let Some(loc) = &engine.uni_orb {
            engine.gl.uniform2f(Some(loc), orb_x as f32, orb_y as f32);
        }
        if let Some(loc) = &engine.uni_band {
            engine.gl.uniform1f(Some(loc), band_px);
        }
        // viewport covers the whole canvas; y-flip happens in-shader
        engine.gl.viewport(0, 0, width as i32, height as i32);

        Ok(WaveEngine { engine, width, height })
    }

    /// One frame. `r` is the eased reveal radius in px, `time_s` seconds
    /// since switch start (drives the shimmer drift).
    pub fn frame(&self, r: f64, time_s: f64) {
        let e = &self.engine;
        e.gl.clear_color(0.0, 0.0, 0.0, 1.0);
        e.gl.clear(web_sys::WebGl2RenderingContext::COLOR_BUFFER_BIT);
        if let Some(loc) = &e.uni_r {
            e.gl.uniform1f(Some(loc), r as f32);
        }
        if let Some(loc) = &e.uni_time {
            e.gl.uniform1f(Some(loc), time_s as f32);
        }
        e.gl.draw_arrays(
            web_sys::WebGl2RenderingContext::TRIANGLES,
            0,
            3,
        );
    }

    /// Max reveal radius for this viewport (corner distance from the orb),
    /// so JS can ease t against a geometry-correct value.
    pub fn max_radius(&self, orb_x: f64, orb_y: f64) -> f64 {
        let dx = if orb_x > self.width / 2.0 { orb_x } else { self.width - orb_x };
        let dy = if orb_y > self.height / 2.0 { orb_y } else { self.height - orb_y };
        (dx * dx + dy * dy).sqrt()
    }
}
