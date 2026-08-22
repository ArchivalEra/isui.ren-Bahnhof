// Station furniture silhouettes: waiting bench, potted plants, floor line.
// Pure SVG painted with theme tokens - they read as furniture in light
// themes and as dim props catching the board's glow in dark ones.
export function HallDecor() {
  const metal = "var(--on-surface-variant)";
  const seat = "var(--surface-container)";
  const leaf = "var(--signal-ok)";
  const pot = "var(--signal-warn)";

  return (
    <div class="hall-decor" aria-hidden="true">
      {/* floor: line + plane */}
      <div class="decor-floor" />
      <svg class="decor decor-bench" viewBox="0 0 220 110" width="220" height="110">
        {/* backrest slats */}
        <rect x="18" y="8" width="184" height="7" rx="3" fill={seat} />
        <rect x="18" y="22" width="184" height="7" rx="3" fill={seat} />
        <rect x="18" y="36" width="184" height="7" rx="3" fill={seat} />
        {/* back posts */}
        <rect x="26" y="4" width="8" height="52" rx="3" fill={metal} />
        <rect x="186" y="4" width="8" height="52" rx="3" fill={metal} />
        {/* seat */}
        <rect x="10" y="52" width="200" height="12" rx="5" fill={seat} />
        {/* legs */}
        <rect x="30" y="64" width="9" height="42" rx="3" fill={metal} />
        <rect x="181" y="64" width="9" height="42" rx="3" fill={metal} />
        <rect x="24" y="98" width="21" height="5" rx="2" fill={metal} opacity=".6" />
        <rect x="175" y="98" width="21" height="5" rx="2" fill={metal} opacity=".6" />
      </svg>

      {/* tall plant, right */}
      <svg class="decor decor-plant-r" viewBox="0 0 120 170" width="120" height="170">
        <ellipse cx="60" cy="34" rx="14" ry="30" fill={leaf} transform="rotate(-18 60 34)" />
        <ellipse cx="44" cy="46" rx="11" ry="26" fill={leaf} transform="rotate(-38 44 46)" opacity=".85" />
        <ellipse cx="78" cy="44" rx="11" ry="27" fill={leaf} transform="rotate(16 78 44)" opacity=".9" />
        <ellipse cx="60" cy="28" rx="9" ry="26" fill={leaf} opacity=".75" />
        <path d="M60 58 C58 84 56 96 50 112 L70 112 C64 96 62 84 60 58 Z" fill={leaf} opacity=".55" />
        {/* pot */}
        <path d="M40 112 H80 L74 158 Q60 164 46 158 Z" fill={pot} />
        <rect x="37" y="108" width="46" height="9" rx="3" fill={pot} />
      </svg>

      {/* small plant, far left */}
      <svg class="decor decor-plant-l" viewBox="0 0 90 120" width="90" height="120">
        <ellipse cx="45" cy="34" rx="11" ry="24" fill={leaf} transform="rotate(-14 45 34)" />
        <ellipse cx="32" cy="46" rx="9" ry="20" fill={leaf} transform="rotate(-36 32 46)" opacity=".85" />
        <ellipse cx="59" cy="44" rx="9" ry="21" fill={leaf} transform="rotate(15 59 44)" opacity=".9" />
        <path d="M45 60 C43 76 42 84 38 94 L52 94 C48 84 47 76 45 60 Z" fill={leaf} opacity=".55" />
        <path d="M31 94 H59 L54 116 Q45 121 36 116 Z" fill={pot} />
        <rect x="29" y="91" width="32" height="7" rx="3" fill={pot} />
      </svg>
    </div>
  );
}
