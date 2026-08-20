function tone(value: number, scale: number): 'good' | 'mixed' | 'bad' {
  const normalized = (value / scale) * 100;
  if (normalized >= 75) return 'good';
  if (normalized >= 50) return 'mixed';
  return 'bad';
}

export default function ScoreBadge({ label, value, scale = 100 }: { label: string; value: number | null; scale?: number }) {
  if (value === null) {
    return (
      <span className="score-badge score-badge--empty">
        <span className="score-badge__value">—</span>
        <span className="score-badge__label">{label}</span>
      </span>
    );
  }

  return (
    <span className={`score-badge score-badge--${tone(value, scale)}`}>
      <span className="score-badge__value">{scale === 100 ? Math.round(value) : value.toFixed(1)}</span>
      <span className="score-badge__label">{label}</span>
    </span>
  );
}
