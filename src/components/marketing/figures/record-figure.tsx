import { cn } from "@/lib/utils";

export interface RecordFigureProps {
  className?: string;
}

interface Layer {
  index: number;
  path: string;
  connectorY: number;
  label: string;
  accent: boolean;
  delay: string;
}

const RECORD_LAYERS: Layer[] = [
  {
    index: 0,
    path: "M 62 256 L 150 212 L 238 256 L 150 300 Z",
    connectorY: 256,
    label: "SOURCE · PPC",
    accent: false,
    delay: "0.12s",
  },
  {
    index: 1,
    path: "M 62 200 L 150 156 L 238 200 L 150 244 Z",
    connectorY: 200,
    label: "OWNER",
    accent: false,
    delay: "0.24s",
  },
  {
    index: 2,
    path: "M 62 144 L 150 100 L 238 144 L 150 188 Z",
    connectorY: 144,
    label: "PROPERTY · $214K",
    accent: false,
    delay: "0.36s",
  },
  {
    index: 3,
    path: "M 62 88 L 150 44 L 238 88 L 150 132 Z",
    connectorY: 88,
    label: "NEXT TASK · THU",
    accent: true,
    delay: "0.48s",
  },
];

const layerClassName =
  "mkt-fadein transition-transform duration-200 ease-out hover:-translate-y-1.5 [&_path]:transition-colors [&_path]:duration-200 hover:[&_path]:stroke-[var(--mkt-accent)]";

export function RecordFigure({ className }: RecordFigureProps) {
  return (
    <svg
      viewBox="0 0 520 340"
      className={cn("block h-auto w-full", className)}
      role="img"
      aria-label="Isometric figure: one seller record built from four stacked data layers"
    >
      <g className="mkt-fadein" style={{ animationDelay: "0.05s" }}>
        <line
          x1="62"
          y1="88"
          x2="62"
          y2="256"
          stroke="var(--mkt-border-subtle)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <line
          x1="238"
          y1="88"
          x2="238"
          y2="256"
          stroke="var(--mkt-border-subtle)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <line
          x1="150"
          y1="132"
          x2="150"
          y2="300"
          stroke="var(--mkt-border-subtle)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <path
          d="M 62 284 L 150 240 L 238 284 L 150 328 Z"
          fill="none"
          stroke="var(--mkt-border-subtle)"
          strokeWidth="1"
          strokeDasharray="2 5"
        />
      </g>

      {RECORD_LAYERS.map((layer) => (
        <g
          key={layer.index}
          data-l={layer.index}
          className={layerClassName}
          style={{ animationDelay: layer.delay }}
        >
          <path
            d={layer.path}
            fill={layer.accent ? "var(--mkt-accent-soft)" : "var(--mkt-surface)"}
            fillOpacity="0.9"
            stroke={layer.accent ? "var(--mkt-accent)" : "var(--mkt-border-strong)"}
            strokeWidth="1"
          />
          <line
            x1="238"
            y1={layer.connectorY}
            x2="272"
            y2={layer.connectorY}
            stroke="var(--mkt-border-subtle)"
            strokeWidth="1"
          />
          <circle
            cx="238"
            cy={layer.connectorY}
            r="2.4"
            fill={layer.accent ? "var(--mkt-accent)" : "var(--mkt-border-strong)"}
          />
          <text
            x="280"
            y={layer.connectorY + 3.5}
            fontFamily="Geist Mono, ui-monospace, monospace"
            fontSize="9.5"
            letterSpacing="0"
            fill={layer.accent ? "var(--mkt-text2)" : "var(--mkt-text3)"}
          >
            {layer.label}
          </text>
        </g>
      ))}

      <g className="mkt-fadein" style={{ animationDelay: "0.8s" }}>
        <circle cx="150" cy="88" r="3" fill="var(--mkt-accent)" />
        <text
          x="150"
          y="30"
          textAnchor="middle"
          fontFamily="Geist Mono, ui-monospace, monospace"
          fontSize="9.5"
          letterSpacing="0"
          fill="var(--mkt-text3)"
        >
          ONE RECORD
        </text>
        <line
          x1="150"
          y1="36"
          x2="150"
          y2="84"
          stroke="var(--mkt-border-subtle)"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}
