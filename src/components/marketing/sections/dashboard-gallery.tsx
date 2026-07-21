"use client";

import { MockBrowserFrame } from "@/components/marketing/mock/mock-browser-frame";
import { MockPipeline } from "@/components/marketing/mock/mock-pipeline";
import { MockScorecard } from "@/components/marketing/mock/mock-scorecard";
import { MockSequence } from "@/components/marketing/mock/mock-sequence";
import { MockTvWall } from "@/components/marketing/mock/mock-tv-wall";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GALLERY_TABS = [
  {
    value: "pipeline",
    label: "Pipeline",
    url: "app.vesperwise.com/pipeline",
    content: <MockPipeline />,
  },
  {
    value: "scorecard",
    label: "Scorecard",
    url: "app.vesperwise.com/scorecard",
    content: <MockScorecard />,
  },
  {
    value: "sequences",
    label: "Sequences",
    url: "app.vesperwise.com/sequences",
    content: <MockSequence />,
  },
  {
    value: "tv-wall",
    label: "TV wall",
    url: "vesperwise.com/tv/floor-1",
    content: <MockTvWall />,
  },
];

export function DashboardGallery() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 sm:px-6">
        <SectionHeading
          eyebrow="Every screen"
          title="Built for the desk, the floor, and the field."
          subcopy="From the closer's pipeline to the TV on the sales floor — the same live numbers everywhere."
        />

        <Tabs defaultValue="pipeline" className="items-center">
          <TabsList>
            {GALLERY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {GALLERY_TABS.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="w-full max-w-4xl"
            >
              <MockBrowserFrame url={tab.url}>{tab.content}</MockBrowserFrame>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
