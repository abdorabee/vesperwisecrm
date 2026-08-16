import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { MockFunnelChart } from "@/components/marketing/mock/mock-funnel-chart";
import { MockRepLeaderboard } from "@/components/marketing/mock/mock-rep-leaderboard";
import { MockSourceTable } from "@/components/marketing/mock/mock-source-table";
import { Reveal } from "@/components/marketing/motion/reveal";

export function Understand() {
  return (
    <section id="ch6" className="mkt-divider bg-[var(--mkt-bg2)] scroll-mt-24">
      <Tabs
        defaultValue="source"
        className="mx-auto min-w-0 max-w-[1240px] gap-0 px-7 py-24 sm:py-28"
      >
        <Reveal className="flex min-w-0 flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-baseline gap-3.5">
              <span className="font-mono text-[clamp(30px,3.4vw,44px)] leading-none tracking-[-0.03em] text-[var(--mkt-text3)]">
                6.0
              </span>
              <h2 className="font-sans text-[clamp(30px,3.4vw,44px)] font-normal leading-none tracking-[-0.032em] text-[var(--mkt-text)]">
                Understand
              </h2>
            </div>
            <p className="mt-5 max-w-[46ch] text-[17px] font-light leading-[1.6] text-[var(--mkt-text2)]">
              Reporting built for acquisitions: cost per contract by source,
              rep activity against outcomes, and conversion at every stage of
              the funnel.
            </p>
          </div>

          <TabsList
            variant="line"
            className="max-w-full rounded-lg border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] p-[3px] text-[var(--mkt-text2)]"
          >
            <UnderstandTab value="source">By source</UnderstandTab>
            <UnderstandTab value="funnel">Funnel</UnderstandTab>
            <UnderstandTab value="rep">By rep</UnderstandTab>
          </TabsList>
        </Reveal>

        <Reveal delay={0.08} className="mt-12 min-w-0">
          <div className="min-w-0 overflow-hidden rounded-[14px] border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] shadow-[0_18px_50px_color-mix(in_oklch,var(--mkt-text)_8%,transparent)]">
            <TabsContent value="source" className="m-0 min-w-0 text-[var(--mkt-text)]">
              <MockSourceTable />
            </TabsContent>
            <TabsContent value="funnel" className="m-0 min-w-0 text-[var(--mkt-text)]">
              <MockFunnelChart />
            </TabsContent>
            <TabsContent value="rep" className="m-0 min-w-0 text-[var(--mkt-text)]">
              <MockRepLeaderboard />
            </TabsContent>
          </div>
        </Reveal>
      </Tabs>
    </section>
  );
}

interface UnderstandTabProps {
  value: string;
  children: string;
}

function UnderstandTab({ value, children }: UnderstandTabProps) {
  return (
    <TabsTrigger
      value={value}
      className="h-8 rounded-md px-3 font-sans text-xs font-medium text-[var(--mkt-text2)] after:bg-[var(--mkt-text)] data-active:bg-[var(--mkt-text)] data-active:text-[var(--mkt-bg)]"
    >
      {children}
    </TabsTrigger>
  );
}
