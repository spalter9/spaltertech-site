/** Pure-CSS brand marks — no image files. */

export function Crest({ size = 44 }: { size?: number }) {
  return <div className="crest" style={{ width: size, height: size }} aria-label="MasterTrust keyhole crest" />;
}

export function Monogram({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <Crest size={compact ? 34 : 42} />
      <div className="leading-none">
        <div
          className="font-display gold-text"
          style={{ fontSize: compact ? 18 : 22, fontWeight: 600, letterSpacing: "0.02em" }}
        >
          SPALTER
        </div>
        <div
          className="font-mono text-muted"
          style={{ fontSize: compact ? 8 : 9, letterSpacing: "0.32em", marginTop: 3 }}
        >
          ENTERTAINMENT TECHNOLOGIES
        </div>
      </div>
    </div>
  );
}
