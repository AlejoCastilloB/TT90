"use client";

type Level = {
  name: string;
  color: string;
  threshold: number; // racha mínima para entrar a este nivel
};

const LEVELS: Level[] = [
  { name: "Arrancando", color: "var(--muted)", threshold: 0 },
  { name: "En marcha", color: "var(--blue)", threshold: 10 },
  { name: "Constante", color: "var(--green)", threshold: 30 },
  { name: "Imparable", color: "var(--amber)", threshold: 60 },
  { name: "Transformado", color: "var(--purple)", threshold: 90 },
];

export default function ProgressBar({ streak }: { streak: number }) {
  const capped = Math.min(streak, 90);
  let levelIndex = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (capped >= LEVELS[i].threshold) {
      levelIndex = i;
      break;
    }
  }
  const current = LEVELS[levelIndex];
  const next = LEVELS[levelIndex + 1];
  const segmentStart = current.threshold;
  const segmentEnd = next ? next.threshold : 90;
  const segmentProgress = next
    ? Math.min(1, (capped - segmentStart) / (segmentEnd - segmentStart))
    : 1;
  const overallPct = (capped / 90) * 100;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span className="eyebrow" style={{ color: current.color }}>{current.name}</span>
        <span className="eyebrow">{streak} / 90 días</span>
      </div>
      <div
        style={{
          position: "relative",
          height: 14,
          borderRadius: 999,
          background: "var(--black-soft)",
          border: "1px solid var(--card-border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${overallPct}%`,
            background: `linear-gradient(90deg, var(--muted), var(--blue), var(--green), var(--amber), var(--purple))`,
            backgroundSize: "500% 100%",
            backgroundPosition: `${(levelIndex / 4) * 100}% 0`,
            transition: "width 0.4s ease",
          }}
        />
        {[10, 30, 60, 90].map((mark) => (
          <div
            key={mark}
            title={`Hito día ${mark}`}
            style={{
              position: "absolute",
              left: `${(mark / 90) * 100}%`,
              top: 0,
              bottom: 0,
              width: 2,
              background: "rgba(10,9,8,0.5)",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {LEVELS.map((l) => (
          <span key={l.name} style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
            {l.threshold}
          </span>
        ))}
      </div>
    </div>
  );
}
