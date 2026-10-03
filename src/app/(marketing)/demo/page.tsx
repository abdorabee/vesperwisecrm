import type { Metadata } from "next";
import { DemoSessionStart } from "./demo-session-start";

export const metadata: Metadata = {
  title: "Open the demo",
  description:
    "Walk the sample acquisition workspace. The sellers are fictional, and the workspace is read-only.",
};

export default function DemoPage() {
  return <DemoSessionStart />;
}
