export default function BoardShell({
  children,
  label,
  baseW = 1280,
}: {
  children: preact.ComponentChildren;
  label?: string;
  baseW?: number;
}) {
  return (
    <div className="board-shell" style={{ maxWidth: baseW }}>
      <div className="board-scroll">{children}</div>
      {label && <div className="board-label">{label}</div>}
    </div>
  );
}
