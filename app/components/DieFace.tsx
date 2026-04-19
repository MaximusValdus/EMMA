'use client';

type Props = { value: number; size?: number; dimmed?: boolean };

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

export default function DieFace({ value, size = 64, dimmed = false }: Props) {
  const dots = DOT_POSITIONS[value] ?? [];
  const r = size * 0.08;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`transition-opacity ${dimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <rect
        x="5" y="5" width="90" height="90" rx="16" ry="16"
        fill="#f5f0e8"
        stroke="#8B6914"
        strokeWidth="4"
      />
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={r * 12} fill="#1a1a1a" />
      ))}
    </svg>
  );
}
