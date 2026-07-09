"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addLeadClientComment } from "@/lib/actions/portal";
import type { Tables } from "@/lib/supabase/types";

interface ClientCommentThreadProps {
  leadId: string;
  comments: Tables<"lead_client_comments">[];
  currentUserId: string;
  viewerLabel: string;
  otherLabel: string;
}

export function ClientCommentThread({
  leadId,
  comments,
  currentUserId,
  viewerLabel,
  otherLabel,
}: ClientCommentThreadProps) {
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");

  function handleSubmit() {
    startTransition(async () => {
      try {
        await addLeadClientComment(leadId, { body });
        setBody("");
        toast.success("Comment sent");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to send comment",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {comment.author_user_id === currentUserId
                    ? viewerLabel
                    : otherLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a comment..."
          className="min-h-16"
        />
        <Button
          type="button"
          size="sm"
          className="w-fit"
          onClick={handleSubmit}
          disabled={isPending || body.trim().length === 0}
        >
          {isPending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
