import Link from "next/link";
import { getWorkflows } from "@/lib/queries/workflows";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TRIGGER_LABELS: Record<string, string> = {
  lead_created: "New lead",
  stage_changed: "Stage changed",
  tag_added: "Tag added",
  no_activity_days: "No activity",
};

export default async function WorkflowsPage() {
  const workflows = await getWorkflows();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Workflows</h1>
        <Button render={<Link href="/workflows/new" />} nativeButton={false}>
          New workflow
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        When a lead is created or changes stage, a workflow can enroll it in a
        sequence, add a tag, or create the next task. It does not send email or SMS.
      </p>

      {workflows.length === 0 ? (
        <p className="text-muted-foreground">
          No workflows yet. Create one to route leads and create the next task.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    {workflow.name}
                    {!workflow.is_active && (
                      <Badge variant="outline" className="text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="text-[10px]">
                    {TRIGGER_LABELS[workflow.trigger_type] ?? workflow.trigger_type}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
