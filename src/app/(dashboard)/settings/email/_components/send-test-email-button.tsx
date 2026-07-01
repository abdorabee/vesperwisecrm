"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={handleSend}
        disabled={disabled || isSending}
      >
        {isSending ? (
          <>
            <Loader2 className="size-4 motion-reduce:animate-none animate-spin" />
            Sending...
          </>
        ) : (
          "Send test email"
        )}
      </Button>
      {disabled && (
        <p className="text-xs text-muted-foreground">
          Verify your domain and save a From address before sending a test.
        </p>
      )}
    </div>
  );
}
