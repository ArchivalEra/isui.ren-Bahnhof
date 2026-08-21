import { getProfile, listProfiles } from "./registry";

const STORAGE_KEY = "bahnhof-profile";
const DEFAULT_ID = "heart";

function applyTokens(tokens: Record<string, string>): void {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
}

function resolveId(raw: string | null): string {
  if (raw && getProfile(raw)) return raw;
  // auto-env: follow system preference if no explicit choice
  if (!raw || raw === "auto-env") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "heart-dark" : "heart";
  }
  return DEFAULT_ID;
}

export function initTheme(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  const id = resolveId(raw);
  const p = getProfile(id);
  if (p) {
    applyTokens(p.tokens);
    document.documentElement.dataset.profile = p.id;
    document.documentElement.style.colorScheme = p.id === "heart-dark" || p.id === "station" ? "dark" : "light";
  }
  // follow system when in auto mode
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (!localStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) === "auto-env") {
      const nid = mq.matches ? "heart-dark" : "heart";
      const np = getProfile(nid);
      if (np) {
        applyTokens(np.tokens);
        document.documentElement.dataset.profile = np.id;
        document.documentElement.style.colorScheme = mq.matches ? "dark" : "light";
      }
    }
  };
  mq.addEventListener("change", onChange);
}

export function setProfile(id: string): void {
  const p = getProfile(id);
  if (!p) return;
  localStorage.setItem(STORAGE_KEY, id);
  applyTokens(p.tokens);
  document.documentElement.dataset.profile = p.id;
  document.documentElement.style.colorScheme = p.id === "heart-dark" || p.id === "station" ? "dark" : "light";
}

export function getCurrentProfileId(): string {
  return document.documentElement.dataset.profile ?? DEFAULT_ID;
}

export { listProfiles, getProfile };
