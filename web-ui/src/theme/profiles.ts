export interface Profile {
  id: string;
  label: string;
  tokens: Record<string, string>;
}

export const profiles: Profile[] = [
  {
    id: "heart",
    label: "Heart — pure white & grey",
    tokens: {
      "--surface": "#ffffff",
      "--surface-dim": "#fafafa",
      "--surface-variant": "#f2f2f2",
      "--surface-container": "#ececec",
      "--outline": "#d9d9d9",
      "--outline-variant": "#b3b3b3",
      "--on-surface": "#111111",
      "--on-surface-variant": "#4d4d4d",
      "--state-hover": "rgba(17,17,17,0.05)",
      "--state-active": "rgba(17,17,17,0.10)",
      "--hall": "#f2f2f2",
    },
  },
  {
    id: "heart-dark",
    label: "Heart — inverted",
    tokens: {
      "--surface": "#111111",
      "--surface-dim": "#1a1a1a",
      "--surface-variant": "#222222",
      "--surface-container": "#2a2a2a",
      "--outline": "#333333",
      "--outline-variant": "#444444",
      "--on-surface": "#f2efe7",
      "--on-surface-variant": "#a9b2c4",
      "--state-hover": "rgba(242,239,231,0.08)",
      "--state-active": "rgba(242,239,231,0.14)",
      "--hall": "#0a0a0a",
    },
  },
  {
    id: "station",
    label: "Station — rail blue (legacy)",
    tokens: {
      "--surface": "#0e1b33",
      "--surface-dim": "#132a4a",
      "--surface-variant": "#1a2f52",
      "--surface-container": "#1e3a5f",
      "--outline": "rgba(242,239,231,0.14)",
      "--outline-variant": "rgba(242,239,231,0.07)",
      "--on-surface": "#f2efe7",
      "--on-surface-variant": "#a9b2c4",
      "--state-hover": "rgba(242,239,231,0.06)",
      "--state-active": "rgba(242,239,231,0.12)",
      "--hall": "#0a1426",
    },
  },
];
