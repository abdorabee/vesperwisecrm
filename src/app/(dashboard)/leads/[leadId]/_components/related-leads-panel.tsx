import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { RelatedLead } from "@/lib/queries/leads";

interface RelatedLeadsPanelProps {
  leads: RelatedLead[];
}

export function RelatedLeadsPanel({ leads }: RelatedLeadsPanelProps) {
  if (leads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No connected leads found yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {leads.map((lead) => {
        const contactName = lead.contact
          ? [lead.contact.first_name, lead.contact.last_name]
              .filter(Boolean)
              .join(" ")
          : "";

        return (
          <div key={lead.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/leads/${lead.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {lead.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {[contactName, lead.contact?.company, lead.stage?.name]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Badge className="bg-primary text-primary-foreground">
                {lead.relevance}% match
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {lead.matchReasons.slice(0, 3).map((reason) => (
                <Badge key={reason} variant="outline" className="text-[10px]">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
