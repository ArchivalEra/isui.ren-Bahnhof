# EdgeOne Subpath Binding Research (isui.ren/Bahnhof)

Research date: 2026-08-15
Scope: Can a second site (`isui.ren/Bahnhof`) coexist with the existing `heart` site under the same root domain, given the current dual-platform setup (EdgeOne Makers for mainland China + Cloudflare Pages for global, both serving the `deploy` branch with zero-build).

---

## TL;DR (conclusions at a glance)

| # | Question | Answer |
|---|----------|--------|
| 1 | EdgeOne Makers: multiple projects bound to different subpaths of one domain? | **No.** Makers (edgeone.ai) custom domains accept only a root domain (`example.com`) or a subdomain (`www.example.com`) — no path prefix. One custom domain belongs to one project/environment. |
| 2 | If not, what alternatives? | (a) Put `Bahnhof` static output under `/Bahnhof/` **inside the same project** as `heart` (simplest, works on both platforms with zero routing). (b) Makers **Middleware** with a matcher on `/Bahnhof/:path*` that `rewrite()`s to a second Makers project's own domain (server-side proxy, browser URL stays `isui.ren/Bahnhof/...`). (c) Subdomain (`bahnhof.isui.ren`) — changes the URL, not a true subpath. |
| 3 | Cloudflare Pages: second project bound to `isui.ren/Bahnhof`? | **No.** CF Pages custom domains are apex/subdomain only — no path. A second project cannot attach to `isui.ren/Bahnhof`. |
| 4 | EdgeOne EO rules engine (free tier, 20 rules) route `/Bahnhof/*` to another deployment? | **Technically yes**, but it belongs to EdgeOne EO (the CDN/edge-acceleration product, `cloud.tencent.com` console), **not** EdgeOne Makers. It can match `URL Path == /Bahnhof/*` and use the **Modify origin** action (origin groups support domain/IP/COS buckets) plus **Origin URL rewrite** to strip `/Bahnhof`. Requires the domain to be added as an EO accelerated site — i.e. moving the CN line off Makers onto EO CDN. Only ~2 rules needed, well within the 20-rule free quota. |
| 5 | Recommended solution | **Keep the single `heart` project bound to the root on both platforms, and ship `Bahnhof` as a static directory `/Bahnhof/` inside that same project's deploy output.** Zero routing config on either platform, works identically on Makers (CN) and CF Pages (global), no domain re-binding, no rules engine needed. If Bahnhof must be an independent project (separate deploys), use Makers Middleware proxy on the CN line and a Cloudflare Worker on the global line. |

---

## Q1. Does EdgeOne Makers support binding multiple projects to different subpaths of one domain?

**No.**

Verified from official Makers docs (https://pages.edgeone.ai/document/custom-domain):

- "Input your root domain (for example: example.com) or subdomain (for example: www.example.com)" — the domain input field accepts a root domain or a subdomain only. There is no path component, so `isui.ren/Bahnhof` cannot be entered as a custom domain.
- Each custom domain is bound to one project and can optionally be pinned to that project's production or preview environment. Two projects cannot share one domain, let alone split a domain by path.
- Per-project free-tier quota allows up to **200 custom domains** (https://pages.edgeone.ai/document/limits-and-quotas), but each is a full domain or subdomain — not a subpath.
- Console path: Project → "Domain Name Management" → "Add custom domain" → enter root/subdomain → verify ownership with a DNS record → configure CNAME. (https://pages.edgeone.ai/document/custom-domain)

No Makers documentation mentions path-prefix/subpath binding anywhere (checked the full doc sitemap: custom-domain, domain-overview, edgeone-json, middleware, faqs, troubleshooting, migration guides).

**Conclusion:** the "EdgeOne side" of the problem is real — EdgeOne Makers does not offer subpath binding between two projects.

---

## Q2. Viable alternatives on EdgeOne Makers

Three viable paths, in order of simplicity:

### Option A — ship Bahnhof as a static directory inside the same project (recommended)

The `deploy` branch already produces output where the root redirects to `/heart` (a single Pages/Makers project is bound to the root). `Bahnhof` is just another static folder:

- Build Bahnhof so its base path is `/Bahnhof/` and drop the output under `Bahnhof/` in the same deploy branch that already holds `heart`.
- `isui.ren/Bahnhof/...` then resolves to static files inside the same Makers project — no custom domain, no routing, no middleware, no rules engine.
- This works **identically on Cloudflare Pages** (see Q3), preserving the dual-platform symmetry (CN via Makers, global via CF) with zero divergence.
- No new domain binding at all, so no conflict with the fact that the root is already bound to `heart`.

Caveats: requires Bahnhof's build to emit path-prefixed assets (or `edgeone.json` rewrites / base-path handling in the framework). Any build-tool base-path config (e.g. Vite `base: '/Bahnhof/'`, Next.js `basePath: '/Bahnhof'`) achieves this. It couples the two sites to one project/deploy pipeline.

### Option B — independent Makers project + Middleware proxy (choose only if Bahnhof needs its own deploys)

Verified: Makers **Middleware** (https://pages.edgeone.ai/document/middleware) runs on edge nodes before page load and supports:

- `rewrite('/new-path')` (relative) **and `rewrite('https://absolute.url')` (absolute, server-side proxy)** — the browser URL stays the original; this is a reverse-proxy rewrite, not a redirect. Documented example even uses `rewrite('https://www.google.com')`.
- `redirect(url, status)` for 301/302/307/308-style client redirects.
- Route matching via `export const config = { matcher: ['/Bahnhof/:path*'] }` (supports single path, multi-path arrays, and regex like `/Bahnhof/.*`).

Concretely: create a second Makers project `bahnhof`, deploy it on its own project domain (e.g. `bahnhof-xxx.pages.edgeone.dev` style auto-assigned project domain). In the `heart` project, add a `middleware.js` that matches `/Bahnhof/:path*` and `rewrite()`s to `https://<bahnhof-project-domain>/<rest-of-path>`. The user keeps typing/seeing `isui.ren/Bahnhof/...`; the edge fetches from the Bahnhof project domain.

Caveats: needs a small JS middleware file; you must map the incoming path to the Bahnhof project's root (strip `/Bahnhof` and forward the remainder); the proxy adds one extra edge hop. Also `edgeone.json` `redirects` can point at absolute external URLs (documented), but a redirect changes the browser URL — only `rewrite()` keeps the subpath. `edgeone.json` `rewrites` destinations are internal paths (documented constraint: "The source path must start with /"), so middleware is the right tool for cross-project proxying.

### Option C — subdomain `bahnhof.isui.ren`

Allowed (subdomains are supported), but the URL becomes `bahnhof.isui.ren`, not `isui.ren/Bahnhof`. Not what the user asked for. Mentioned only for completeness.

---

## Q3. Cloudflare Pages: can a second project bind to `isui.ren/Bahnhof`?

**No.**

Verified from https://developers.cloudflare.com/pages/configuration/custom-domains/:

- CF Pages custom domains are limited to an **apex domain** (e.g. `example.com`) or a **subdomain** (e.g. `shop.example.com`). Path prefixes are not supported by the custom-domain feature.
- Therefore two CF Pages projects cannot split the same root domain by path. The existing `heart` CF Pages project already owns `isui.ren` on the global line.

CF-side alternatives for a subpath:

- Same as Option A above: since CF Pages serves the static files of whatever is on the `deploy` branch, adding a `Bahnhof/` directory to the same project automatically serves `isui.ren/Bahnhof/*` — no CF config needed.
- If Bahnhof must be a separate CF Pages project, you cannot bind it to `isui.ren/Bahnhof`. You would either (a) put it on its own subdomain, or (b) front both with a **Cloudflare Worker** on `isui.ren/*` that fetches from the Bahnhof project URL for `/Bahnhof/*` and from heart otherwise. Note: CF Pages `_redirects` proxying only supports relative same-site URLs — it explicitly cannot proxy external domains (https://developers.cloudflare.com/pages/configuration/redirects/), so a Worker is required for cross-project proxying.

**Conclusion:** CF Pages has the same limitation as Makers: no subpath binding. The single-project-directory approach (Option A) is the only approach that works on both platforms with identical behavior.

---

## Q4. Can the EdgeOne rules engine route `/Bahnhof/*` to another deployment?

**Yes — technically — but it is the EdgeOne EO (CDN) rules engine, not EdgeOne Makers.** This distinction matters and is the crux of the "EdgeOne side" of the ticket.

Verified facts from Tencent Cloud EdgeOne EO docs (cloud.tencent.com/document/product/1552):

- **Free tier rule quota: 20 rules engine rules.** Confirmed in the free-plan doc ("free plan supports only 20 rules-engine rules", https://cloud.tencent.com/document/product/1552/118985).
- **Match types include `URL Path` with wildcards** — e.g. value `/example/*` matches the directory and everything under it (https://cloud.tencent.com/document/product/1552/90438). So a rule trigger of `URL Path == /Bahnhof/*` is directly supported.
- **Actions include `Modify origin`** (labeled "modify origin" in the CN console) — configures complex origin-return strategies including **per-path** origin selection ("per-path"), and origin groups support IP, domain, and COS/S3 object storage (https://cloud.tencent.com/document/product/1552/70904, https://cloud.tencent.com/document/product/1552/90438).
- **Actions include `Origin URL rewrite`** (labeled "origin URL rewrite" in the CN console) — rewrites the request path before fetching from origin without changing the cache key (https://cloud.tencent.com/document/product/1552/90438). So you can rewrite `/Bahnhof/foo` → `/foo` at the origin so Bahnhof's own deployment doesn't need the `/Bahnhof` prefix baked in.

So the rules-engine pattern is:

1. Domain `isui.ren` added as an EdgeOne EO accelerated site.
2. Origin group `heart` → heart's existing origin (the Makers project domain or a COS bucket).
3. Origin group `bahnhof` → Bahnhof's deployment (a Makers/Pages project domain, or a COS/S3 bucket).
4. Rule 1: `URL Path == /Bahnhof/*` → `Modify origin` = bahnhof group + `Origin URL rewrite` `/Bahnhof/*` → `/*`.
5. Rule 2 (fallback/`All`): default origin = heart group.

That uses 2 rules out of the free 20.

**Deployment form for Bahnhof under this scheme:** it should be an *origin*, not a second custom-domain binding. Simplest is a COS (or S3-compatible) bucket holding Bahnhof's static files, or the Bahnhof Makers project's own domain.

**Big caveat:** the EO rules engine lives in the EdgeOne EO product (Tencent Cloud console, domain as an "accelerated site"). EdgeOne Makers is a separate Pages-style product built on EO infrastructure; Makers does **not** expose this rules engine in its own project console. To use it you must add `isui.ren` to EdgeOne EO as an accelerated site, which implies:
- moving the mainland-China line from the Makers project binding to an EO CDN site (origin = heart's existing project domain or a bucket), and
- likely re-binding/re-pointing DNS/CNAME, since one domain cannot simultaneously be a Makers custom domain and an EO accelerated site without conflict ("domain already exists on another Tencent Cloud acceleration platform" — documented in Makers troubleshooting).

That is a migration of the CN line's architecture, not an incremental add-on. Given the user's framing ("this is an EdgeOne problem"), this is the heavyweight but fully-supported path; the lightweight path remains Option A.

---

## Recommended solution (Q5)

**Primary recommendation — Option A (same project, static directory):**

1. Keep `isui.ren` bound to the existing `heart` project on both platforms (EdgeOne Makers CN line + Cloudflare Pages global line) — no domain changes at all.
2. Build Bahnhof with base path `/Bahnhof/` (e.g. Vite `base: '/Bahnhof/'`, Next.js `basePath: '/Bahnhof'`, or a plain static folder layout).
3. Drop Bahnhof's output into the `deploy` branch under `Bahnhof/`, alongside the existing `heart` content.
4. Deploy as before (zero-build push). Both platforms now serve:
   - `isui.ren/` → existing root redirect to `/heart`
   - `isui.ren/heart/...` → heart (unchanged)
   - `isui.ren/Bahnhof/...` → Bahnhof
5. No middleware, no rules engine, no new custom domains, no DNS changes. Behavior is identical on the CN and global lines because both platforms serve the same static output.

**If Bahnhof must remain a fully independent project (own repo/deploy pipeline):**

- CN line: second Makers project `bahnhof` on its own auto-assigned project domain; add `middleware.js` to the `heart` project matching `['/Bahnhof/:path*']` and `rewrite()` to the bahnhof project domain (server-side proxy, URL preserved).
- Global line: separate CF Pages project `bahnhof`; add a Cloudflare Worker route on `isui.ren` that fetches Bahnhof's Pages URL for `/Bahnhof/*` (CF `_redirects` cannot proxy external hosts).
- Downside: two divergent routing mechanisms (Makers middleware vs CF Worker) to maintain; recommend only if independent deploys are a hard requirement.

**Rules-engine route (Q4)** — viable but only choose if you intend to move the CN line onto EdgeOne EO CDN as an accelerated site and are comfortable re-pointing the domain; not needed for a static second site.

---

## Facts vs Inference

**Verified facts (official docs):**
- Makers custom domains: root or subdomain only, no path. — https://pages.edgeone.ai/document/custom-domain
- Makers free-tier limits: 40 projects, 200 custom domains per project, 500 builds/month. — https://pages.edgeone.ai/document/limits-and-quotas
- Makers Middleware supports relative and absolute `rewrite()` (server-side proxy), `redirect()`, and matchers including `/path/:param*` and regex. — https://pages.edgeone.ai/document/middleware
- `edgeone.json` redirects can target absolute external URLs; rewrites are internal-path only and their source must start with `/`; max 100 each. — https://pages.edgeone.ai/document/edgeone-json
- CF Pages custom domains: apex/subdomain only, no path. — https://developers.cloudflare.com/pages/configuration/custom-domains/
- CF Pages `_redirects` proxy (status 200) supports only relative same-site URLs, not external domains. — https://developers.cloudflare.com/pages/configuration/redirects/
- EdgeOne EO free tier: 20 rules engine rules. — https://cloud.tencent.com/document/product/1552/118985
- EO rules engine match types include URL Path (with wildcard `/example/*`) and actions include Modify origin and Origin URL rewrite. — https://cloud.tencent.com/document/product/1552/90438
- EO origin groups support domain/IP and COS/S3 object-storage origins, and can be referenced by the rules engine. — https://cloud.tencent.com/document/product/1552/70904
- Makers troubleshooting notes a domain cannot exist simultaneously on another Tencent Cloud acceleration platform (CDN or EdgeOne) without deleting the conflicting rule/domain. — https://pages.edgeone.ai/document/troubleshooting

**Inference (reasonable, not directly documented):**
- A static subdirectory inside an already-bound project is served at its path automatically — inferred from Makers/CF Pages serving project output at any URL under the bound domain (their "direct upload / zero-build static hosting" model), and from the fact that `heart` is already served at `/heart` this way. Low risk; trivially verifiable by pushing an `index.html` to `Bahnhof/` in the branch.
- The concrete Makers middleware snippet (matcher `/Bahnhof/:path*` + absolute `rewrite()`) works across projects — inferred from the documented absolute-URL `rewrite()` behavior. Medium confidence; needs a quick test deployment to confirm path remapping.
- CF Worker as the global-line proxy — standard CF architecture, but not verified against the specific Pages setup.
- The exact DNS/CNAME mechanics of moving the CN line to EO CDN — high-level, from product architecture; exact console steps need verification in the actual EO console.

---

## Ticket resolution

EdgeOne Makers does not support binding a second project to a subpath like `isui.ren/Bahnhof` — its custom domains accept root or subdomain only (same limitation applies to Cloudflare Pages). The clean fix requires no domain changes at all: build Bahnhof with base path `/Bahnhof/` and ship its static output inside the existing `heart` project's `deploy` branch, so both the EdgeOne Makers (CN) and Cloudflare Pages (global) lines serve `isui.ren/Bahnhof/*` from the same project with zero routing config. If Bahnhof must be an independent project, the CN line can use a Makers Middleware `rewrite()` proxy and the global line a Cloudflare Worker; the EdgeOne EO rules engine (free tier: 20 rules) could also route `/Bahnhof/*` to a separate origin, but that requires moving the CN line onto EO CDN, which is unnecessary for a static second site.
