import { profiles, type Profile } from "./profiles";

const map = new Map<string, Profile>(profiles.map((p) => [p.id, p]));

export function listProfiles(): Profile[] {
  return [...map.values()];
}

export function getProfile(id: string): Profile | undefined {
  return map.get(id);
}

export function registerProfile(p: Profile): void {
  map.set(p.id, p);
}
