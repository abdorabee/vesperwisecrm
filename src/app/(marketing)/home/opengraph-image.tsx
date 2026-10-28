import { ImageResponse } from "next/og";

export const alt =
  "VesperWise CRM — track every lead and its next task";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 40,
          padding: 96,
          background: "#000000",
          backgroundImage:
            "linear-gradient(to bottom, rgba(223,255,0,0.08), transparent 60%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            VESPER
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#dfff00",
              color: "#000000",
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: -1,
              padding: "8px 16px",
            }}
          >
            WISE.
          </span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontWeight: 600,
            letterSpacing: -2,
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          Track every lead and its next task.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#a0a0a0",
            maxWidth: 860,
          }}
        >
          A pipeline CRM for leads, stages, notes, tasks, and owners.
        </div>
      </div>
    ),
    { ...size },
  );
}
