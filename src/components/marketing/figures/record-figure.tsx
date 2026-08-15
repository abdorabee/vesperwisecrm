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
    path: "M 62 258 L 150 214 L 238 258 L 150 302 Z",
    connectorY: 258,
    label: "SOURCE · PPC",
    accent: false,
    delay: "0.12s",
  },
  {
    index: 1,
    path: "M 62 224 L 150 180 L 238 224 L 150 268 Z",
    connectorY: 224,
    label: "OWNER · VERIFIED",
    accent: false,
    delay: "0.21s",
  },
  {
    index: 2,
    path: "M 62 190 L 150 146 L 238 190 L 150 234 Z",
    connectorY: 190,
    label: "PROPERTY · $214K",
    accent: false,
    delay: "0.30s",
  },
  {
    index: 3,
    path: "M 62 156 L 150 112 L 238 156 L 150 200 Z",
    connectorY: 156,
    label: "PHONES · 3 VERIFIED",
    accent: true,
    delay: "0.39s",
  },
  {
    index: 4,
    path: "M 62 122 L 150 78 L 238 122 L 150 166 Z",
    connectorY: 122,
    label: "CALL · 07:12",
    accent: true,
    delay: "0.48s",
  },
  {
    index: 5,
    path: "M 62 88 L 150 44 L 238 88 L 150 132 Z",
    connectorY: 88,
    label: "SCORE · 92",
    accent: true,
    delay: "0.57s",
  },
];

const layerClassName =
  "mkt-fadein transition-transform duration-200 ease-out hover:-translate-y-1.5 [&_path]:transition-colors [&_path]:duration-200 hover:[&_path]:stroke-[var(--mkt-accent)]";

export function RecordFigure({ className }: RecordFigureProps) {
  return (
    <svg
      viewBox="0 0 420 340"
      className={cn("block h-auto w-full", className)}
      role="img"
      aria-label="Isometric figure: one seller record built from six stacked data layers"
    >
      <g className="mkt-fadein" style={{ animationDelay: "0.05s" }}>
        <line
          x1="62"
          y1="88"
          x2="62"
          y2="258"
          stroke="var(--mkt-border-subtle)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <line
          x1="238"
          y1="88"
          x2="238"
          y2="258"
          stroke="var(--mkt-border-subtle)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <line
          x1="150"
          y1="132"
          x2="150"
          y2="302"
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
