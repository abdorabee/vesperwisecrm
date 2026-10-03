import Link from "next/link";

export function DemoSampleBanner() {
  return (
    <div className="sticky top-14 z-30 border-b border-border bg-card px-4 py-2.5 md:top-0">
      <p className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">Sample data.</span>
        <span className="text-muted-foreground">
          These sellers are fictional. Nothing you change is saved.
        </span>
        <Link
          href="/signup"
          className="font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          Create a workspace
        </Link>
      </p>
    </div>
  );
}
