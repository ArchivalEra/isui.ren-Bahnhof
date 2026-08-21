import { useEffect, useState } from "preact/hooks";
import { listProfiles, getCurrentProfileId, setProfile } from "./index";

export default function ProfileSwitcher() {
  const [id, setId] = useState(() => getCurrentProfileId());
  const profiles = listProfiles();
  useEffect(() => {
    const onStorage = () => setId(getCurrentProfileId());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const onChange = (e: Event) => {
    const v = (e.target as HTMLSelectElement).value;
    setProfile(v);
    setId(v);
  };
  return (
    <label className="profile-switcher" aria-label="Theme profile">
      <span className="profile-switcher-label" aria-hidden="true">◐</span>
      <select value={id} onChange={onChange} aria-label="Theme profile">
        {profiles.map((pr) => (
          <option key={pr.id} value={pr.id}>{pr.label}</option>
        ))}
      </select>
    </label>
  );
}
