import Link from "next/link";
import { getSequences } from "@/lib/queries/sequences";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SequencesPage() {
  const sequences = await getSequences();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sequences</h1>
        <Button render={<Link href="/sequences/new" />} nativeButton={false}>
          New sequence
        </Button>
      </div>

      {sequences.length === 0 ? (
        <p className="text-muted-foreground">
          No sequences yet. Create one to start building outreach steps.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sequences.map((sequence) => (
            <Link key={sequence.id} href={`/sequences/${sequence.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{sequence.name}</CardTitle>
                </CardHeader>
                {sequence.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {sequence.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
