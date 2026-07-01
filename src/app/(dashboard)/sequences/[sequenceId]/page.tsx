import { getSequenceDetail } from "@/lib/queries/sequences";
import { SequenceForm } from "../_components/sequence-form";
import type { SequenceInput } from "@/lib/validations/sequence";

interface SequenceDetailPageProps {
  params: Promise<{ sequenceId: string }>;
}

export default async function SequenceDetailPage({
  params,
}: SequenceDetailPageProps) {
  const { sequenceId } = await params;
  const { sequence, steps } = await getSequenceDetail(sequenceId);

  const defaultValues: SequenceInput = {
    name: sequence.name,
    description: sequence.description ?? "",
    steps: steps.map((step) => ({
      channel: step.channel === "sms" ? "sms" : "email",
      delayDays: String(step.delay_days),
      subject: step.subject ?? "",
      bodyTemplate: step.body_template,
    })),
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{sequence.name}</h1>
      <SequenceForm sequenceId={sequence.id} defaultValues={defaultValues} />
    </div>
  );
}
