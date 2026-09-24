import type { ConsolePosition } from "@/lib/database";

const COMPASS_ANGLES: Record<ConsolePosition["position"], number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

const SIZE = 320;
const CENTER = SIZE / 2;
const CONSOLE_RADIUS = 130;
const TABLE_WIDTH = 60;
const TABLE_HEIGHT = 160;

function pointOnCompass(position: ConsolePosition["position"], radius: number) {
  const angleRad = ((COMPASS_ANGLES[position] - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER + radius * Math.sin(angleRad),
  };
}

type Props = {
  tableAngle: number;
  tableOrientation: string;
  consoles: ConsolePosition[];
};

export default function TheatreDiagram({
  tableAngle,
  tableOrientation,
  consoles,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={`Theatre set-up: table rotated ${tableAngle} degrees, ${
          tableOrientation || "orientation not specified"
        }`}
        className="max-w-full text-zinc-700 dark:text-zinc-300"
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={CONSOLE_RADIUS + 24}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
        />
        {(["N", "E", "S", "W"] as const).map((dir) => {
          const p = pointOnCompass(dir, CONSOLE_RADIUS + 24);
          return (
            <text
              key={dir}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-current text-[10px] opacity-40"
            >
              {dir}
            </text>
          );
        })}
        <rect
          x={CENTER - TABLE_WIDTH / 2}
          y={CENTER - TABLE_HEIGHT / 2}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          rx={8}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          transform={`rotate(${tableAngle} ${CENTER} ${CENTER})`}
        />
        <text
          x={CENTER}
          y={CENTER}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(${tableAngle} ${CENTER} ${CENTER})`}
          className="fill-current text-[10px] opacity-60"
        >
          Table
        </text>
        {consoles.map((c, i) => {
          const p = pointOnCompass(c.position, CONSOLE_RADIUS);
          return (
            <g key={`${c.label}-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={20}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-current text-[9px]"
              >
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {tableOrientation || "No table orientation notes"} &middot; {tableAngle}°
      </p>
    </div>
  );
}
