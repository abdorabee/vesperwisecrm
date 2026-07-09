import { PageHeader } from "@/components/page-header";
import { IntakeForm } from "./_components/intake-form";

export default function IntakePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Submit a lead"
        description="Capture the call in the order you're asking questions. Only the phone number and property address are required — everything else can be filled in as you go."
      />
      <IntakeForm />
    </div>
  );
}
