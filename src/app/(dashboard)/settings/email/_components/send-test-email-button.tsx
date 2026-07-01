"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendTestEmail } from "@/lib/actions/account-email";

interface SendTestEmailButtonProps {
  disabled: boolean;
}

export function SendTestEmailButton({ disabled }: SendTestEmailButtonProps) {
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    setIsSending(true);
    try {
      await sendTestEmail();
      toast.success("Test email sent to your login address");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send test email",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSend}
      disabled={disabled || isSending}
    >
      {isSending ? "Sending..." : "Send test email"}
    </Button>
  );
}
