import type { CSSProperties } from "react";

interface StepFigureProps {
  className?: string;
}

const LAYER_CLASS =
  "mkt-fadein transition-transform duration-300 ease-out [transform-box:fill-box] [transform-origin:center] hover:-translate-y-1.5 hover:[&_path]:stroke-[var(--mkt-accent)] hover:[&_polygon]:stroke-[var(--mkt-accent)] [&_path]:transition-colors [&_path]:duration-200 [&_polygon]:transition-colors [&_polygon]:duration-200";

function layerStyle(delay: string): CSSProperties {
  return { animationDelay: delay };
}

export function CaptureFigure({ className }: StepFigureProps) {
  return (
    <svg
      viewBox="0 0 300 250"
      data-fig="intake"
      className={className}
      role="img"
      aria-label="Isometric figure: three lead sources landing on one enriched stack"
    >
      <path
        d="M 64 222 L 150 179 L 236 222 L 150 265 Z"
        fill="none"
        stroke="var(--mkt-border-subtle)"
        strokeWidth="1"
        strokeDasharray="2 5"
      />
      <g className="mkt-fadein" style={layerStyle("0.50s")}>
        <line
          x1="26"
          y1="54"
          x2="150"
          y2="120"
          stroke="var(--mkt-border-subtle)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <circle cx="26" cy="54" r="3" fill="var(--mkt-surface)" stroke="var(--mkt-border-strong)" strokeWidth="1" />
      </g>
      <g className="mkt-fadein" style={layerStyle("0.60s")}>
        <line
          x1="150"
          y1="20"
          x2="150"
          y2="120"
          stroke="var(--mkt-border-subtle)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <circle cx="150" cy="20" r="3" fill="var(--mkt-accent)" stroke="var(--mkt-border-strong)" strokeWidth="1" />
      </g>
      <g className="mkt-fadein" style={layerStyle("0.70s")}>
        <line
          x1="274"
          y1="54"
          x2="150"
          y2="120"
          stroke="var(--mkt-border-subtle)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <circle cx="274" cy="54" r="3" fill="var(--mkt-surface)" stroke="var(--mkt-border-strong)" strokeWidth="1" />
      </g>
      <g data-l="0" className={LAYER_CLASS} style={layerStyle("0.10s")}>
        <path
          d="M 64 196 L 150 153 L 236 196 L 150 239 Z"
          fill="var(--mkt-surface)"
          fillOpacity="0.9"
          stroke="var(--mkt-border-strong)"
          strokeWidth="1"
        />
      </g>
      <g data-l="1" className={LAYER_CLASS} style={layerStyle("0.19s")}>
        <path
          d="M 64 170 L 150 127 L 236 170 L 150 213 Z"
          fill="var(--mkt-surface)"
          fillOpacity="0.9"
          stroke="var(--mkt-border-strong)"
          strokeWidth="1"
        />
      </g>
      <g data-l="2" className={LAYER_CLASS} style={layerStyle("0.28s")}>
        <path
          d="M 64 144 L 150 101 L 236 144 L 150 187 Z"
          fill="var(--mkt-surface)"
          fillOpacity="0.9"
          stroke="var(--mkt-border-strong)"
          strokeWidth="1"
        />
      </g>
      <g data-l="3" className={LAYER_CLASS} style={layerStyle("0.37s")}>
        <path
          d="M 64 118 L 150 75 L 236 118 L 150 161 Z"
          fill="var(--mkt-accent-soft)"
          fillOpacity="0.9"
          stroke="var(--mkt-accent)"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}

export function QualifyFigure({ className }: StepFigureProps) {
  return (
    <svg
      viewBox="0 0 300 250"
      data-fig="qualify"
      className={className}
      role="img"
      aria-label="Isometric figure: three leads scored to different heights, the strongest highlighted"
    >
      <path
        d="M 54 196 L 150 148 L 246 196 L 150 244 Z"
        fill="none"
        stroke="var(--mkt-border-subtle)"
        strokeWidth="1"
        strokeDasharray="2 5"
      />
      <g data-l="0" className={LAYER_CLASS} style={layerStyle("0.10s")}>
        <polygon points="34,194 34,150 78,172 78,216" fill="var(--mkt-surface)" fillOpacity="0.75" stroke="var(--mkt-border-strong)" strokeWidth="1" />
        <polygon points="122,194 122,150 78,172 78,216" fill="var(--mkt-surface)" fillOpacity="0.55" stroke="var(--mkt-border-strong)" strokeWidth="1" />
        <path d="M 34 150 L 78 128 L 122 150 L 78 172 Z" fill="var(--mkt-surface)" fillOpacity="0.95" stroke="var(--mkt-border-strong)" strokeWidth="1" />
      </g>
      <g data-l="1" className={LAYER_CLASS} style={layerStyle("0.20s")}>
        <polygon points="106,194 106,120 150,142 150,216" fill="var(--mkt-accent-soft)" fillOpacity="0.75" stroke="var(--mkt-accent)" strokeWidth="1" />
        <polygon points="194,194 194,120 150,142 150,216" fill="var(--mkt-accent-soft)" fillOpacity="0.55" stroke="var(--mkt-accent)" strokeWidth="1" />
        <path d="M 106 120 L 150 98 L 194 120 L 150 142 Z" fill="var(--mkt-accent-soft)" fillOpacity="0.95" stroke="var(--mkt-accent)" strokeWidth="1" />
      </g>
      <g data-l="2" className={LAYER_CLASS} style={layerStyle("0.30s")}>
        <polygon points="178,194 178,164 222,186 222,216" fill="var(--mkt-surface)" fillOpacity="0.75" stroke="var(--mkt-border-strong)" strokeWidth="1" />
        <polygon points="266,194 266,164 222,186 222,216" fill="var(--mkt-surface)" fillOpacity="0.55" stroke="var(--mkt-border-strong)" strokeWidth="1" />
        <path d="M 178 164 L 222 142 L 266 164 L 222 186 Z" fill="var(--mkt-surface)" fillOpacity="0.95" stroke="var(--mkt-border-strong)" strokeWidth="1" />
      </g>
      <g className="mkt-fadein" style={layerStyle("0.45s")}>
        <line x1="150" y1="88" x2="150" y2="62" stroke="var(--mkt-border-subtle)" strokeWidth="1" />
        <text
          x="150"
          y="54"
          textAnchor="middle"
          fontFamily="Geist Mono, ui-monospace, monospace"
          fontSize="9.5"
          letterSpacing="0.7"
          fill="var(--mkt-text3)"
        >
          92
        </text>
      </g>
    </svg>
  );
}

export function CloseFigure({ className }: StepFigureProps) {
  return (
    <svg
      viewBox="0 0 300 250"
      data-fig="close"
      className={className}
      role="img"
      aria-label="Isometric figure: deals advancing through pipeline stages"
    >
      <line
        x1="16"
        y1="228"
        x2="284"
        y2="94"
        stroke="var(--mkt-border-subtle)"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <g data-l="0" className={LAYER_CLASS} style={layerStyle("0.08s")}>
        <path d="M 16 200 L 68 174 L 120 200 L 68 226 Z" fill="var(--mkt-surface)" fillOpacity="0.9" stroke="var(--mkt-border-strong)" strokeWidth="1" />
      </g>
      <g data-l="1" className={LAYER_CLASS} style={layerStyle("0.15s")}>
        <path d="M 40 183 L 92 157 L 144 183 L 92 209 Z" fill="var(--mkt-surface)" fillOpacity="0.9" stroke="var(--mkt-border-strong)" strokeWidth="1" />
      </g>
      <g data-l="2" className={LAYER_CLASS} style={layerStyle("0.22s")}>
        <path d="M 64 166 L 116 140 L 168 166 L 116 192 Z" fill="var(--mkt-surface)" fillOpacity="0.9" stroke="var(--mkt-border-strong)" strokeWidth="1" />
      </g>
      <g data-l="3" className={LAYER_CLASS} style={layerStyle("0.29s")}>
        <path d="M 88 149 L 140 123 L 192 149 L 140 175 Z" fill="var(--mkt-surface)" fillOpacity="0.9" stroke="var(--mkt-border-strong)" strokeWidth="1" />
      </g>
      <g data-l="4" className={LAYER_CLASS} style={layerStyle("0.36s")}>
        <path d="M 112 132 L 164 106 L 216 132 L 164 158 Z" fill="var(--mkt-surface)" fillOpacity="0.9" stroke="var(--mkt-border-strong)" strokeWidth="1" />
      </g>
      <g data-l="5" className={LAYER_CLASS} style={layerStyle("0.43s")}>
        <path d="M 136 115 L 188 89 L 240 115 L 188 141 Z" fill="var(--mkt-accent-soft)" fillOpacity="0.9" stroke="var(--mkt-accent)" strokeWidth="1" />
      </g>
      <g data-l="6" className={LAYER_CLASS} style={layerStyle("0.50s")}>
        <path d="M 160 98 L 212 72 L 264 98 L 212 124 Z" fill="var(--mkt-accent-soft)" fillOpacity="0.9" stroke="var(--mkt-accent)" strokeWidth="1" />
      </g>
    </svg>
  );
}
