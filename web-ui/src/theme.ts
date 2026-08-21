// Theme profiles as signals — @preact/signals drives reactivity.
// heart = pure white & grey (default), heart-dark = inverted,
// station = rail blue legacy. Add a profile here and the switcher
// picks it up automatically.
import { signal } from "@preact/signals";

export interface Profile {
  id: string;
  label: string;
  dark: boolean;
  tokens: Record<string, string>;
}

export const profiles: Profile[] = [
  {
    id: "heart",
    label: "Heart",
    dark: false,
    tokens: {
      "--surface": "#ffffff",
      "--surface-dim": "#fafafa",
      "--surface-variant": "#f2f2f2",
      "--outline": "#d9d9d9",
      "--on-surface": "#111111",
      "--on-surface-variant": "#4d4d4d",
    },
  },
  {
    id: "heart-dark",
    label: "Heart Dark",
    dark: true,
    tokens: {
      "--surface": "#111111",
      "--surface-dim": "#1a1a1a",
      "--surface-variant": "#222222",
      "--outline": "#333333",
      "--on-surface": "#f2efe7",
      "--on-surface-variant": "#a9b2c4",
    },
  },
  {
    id: "station",
    label: "Station Blue",
    dark: true,
    tokens: {
      "--surface": "#0e1b33",
      "--surface-dim": "#132a4a",
      "--surface-variant": "#1a2f52",
      "--outline": "#2a3f5f",
      "--on-surface": "#f2efe7",
      "--on-surface-variant": "#a9b2c4",
    },
  },
];

const STORAGE_KEY = "bahnhof-profile";

export const currentId = signal<string>(loadInitial());

function loadInitial(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && profiles.some((p) => p.id === saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "heart-dark"
    : "heart";
}

export function currentProfile(): Profile {
  return profiles.find((p) => p.id === currentId.value) ?? profiles[0];
}

export function setProfile(id: string): void {
  if (!profiles.some((p) => p.id === id)) return;
  currentId.value = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage unavailable */
  }
}

/** Apply profile tokens to :root. Call once at startup. */
export function initTheme(): void {
  const apply = () => {
    const p = currentProfile();
    for (const [k, v] of Object.entries(p.tokens)) {
      document.documentElement.style.setProperty(k, v);
    }
    document.documentElement.dataset.profile = p.id;
    document.documentElement.style.colorScheme = p.dark ? "dark" : "light";
  };
  apply();
  // React to system changes only while on auto (no explicit save yet is
  // approximated by re-applying; explicit choice persists via setProfile).
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        currentId.value = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "heart-dark"
          : "heart";
        apply();
      }
    });
}
