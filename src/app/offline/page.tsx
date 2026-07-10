import { VesperWiseLogo } from "@/components/vesper-wise-logo";

export const metadata = {
  title: "Offline — VesperwiseCRM",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <VesperWiseLogo size="sm" />
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        VesperwiseCRM needs a connection to load your leads. Check your network
        and try again.
      </p>
    </main>
  );
}
