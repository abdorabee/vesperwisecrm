"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cancelDialerCall, reportDialerClientFailure, startDialerCall } from "@/lib/actions/dialer";
import type { BrowserVoiceSession } from "@/lib/dialer/providers/twilio/client";
import { connectBrowserCall } from "@/lib/dialer/client";
import { TERMINAL_CALL_STATUSES, type NormalizedCallStatus } from "@/lib/dialer/types";

export interface ActiveDialerSession {
  callId: string;
  attemptId: string;
  contactId: string;
  contactName: string;
  leadId: string | null;
  leadTitle: string | null;
  status: NormalizedCallStatus;
  startedAt: string;
  error: string | null;
  recoverable: boolean;
}

interface StartTarget {
  contactId: string;
  contactName?: string;
  leadId?: string | null;
  queueItemId?: string | null;
}

interface DialerContextValue {
  enabled: boolean;
  twilioConnected: boolean;
  active: ActiveDialerSession | null;
  muted: boolean;
  starting: boolean;
  realtimeConnected: boolean;
  start: (target: StartTarget) => Promise<void>;
  hangup: () => Promise<void>;
  toggleMute: () => void;
  clear: () => void;
}

const DialerContext = createContext<DialerContextValue | null>(null);

export function DialerSessionProvider({
  children,
  initialSession,
  enabled,
  twilioConnected,
}: {
  children: ReactNode;
  initialSession: ActiveDialerSession | null;
  enabled: boolean;
  twilioConnected: boolean;
}) {
  const [active, setActive] = useState(initialSession);
  const [muted, setMuted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const voiceRef = useRef<BrowserVoiceSession | null>(null);

  const updateStatus = useCallback((status: NormalizedCallStatus) => {
    setActive((current) => current ? { ...current, status } : current);
  }, []);

  const start = useCallback(async (target: StartTarget) => {
    if (active && !TERMINAL_CALL_STATUSES.has(active.status)) {
      toast.error("Finish the active call before starting another one");
      return;
    }
    if (!twilioConnected) {
      toast.error("Connect a Twilio account in Dialer → Settings before calling");
      return;
    }
    setStarting(true);
    voiceRef.current?.destroy();
    voiceRef.current = null;
    let reservedAttemptId: string | null = null;
    try {
      const prepared = await startDialerCall({
        contactId: target.contactId,
        leadId: target.leadId ?? null,
        queueItemId: target.queueItemId ?? null,
        idempotencyKey: crypto.randomUUID(),
      });
      reservedAttemptId = prepared.attemptId;
      setActive({
        callId: prepared.callId,
        attemptId: prepared.attemptId,
        contactId: prepared.contact.id,
        contactName: prepared.contact.name || target.contactName || "Contact",
        leadId: prepared.leadId,
        leadTitle: null,
        status: prepared.status,
        startedAt: new Date().toISOString(),
        error: null,
        recoverable: true,
      });
      const voice = await connectBrowserCall(
        prepared.initiation.accessToken,
        prepared.initiation.connectParams,
        {
          onStatus: (status) => updateStatus(status),
          onError: (message) => {
            setActive((current) => current ? { ...current, status: "failed", error: message } : current);
            toast.error(message);
            void reportDialerClientFailure(prepared.attemptId);
          },
        },
      );
      voiceRef.current = voice;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start the call";
      toast.error(message);
      setActive((current) => current ? { ...current, status: "failed", error: message } : current);
      if (reservedAttemptId) {
        void reportDialerClientFailure(reservedAttemptId);
      }
    } finally {
      setStarting(false);
    }
  }, [active, twilioConnected, updateStatus]);

  const hangup = useCallback(async () => {
    if (!active) return;
    voiceRef.current?.call.disconnect();
    try {
      await cancelDialerCall({ attemptId: active.attemptId });
      updateStatus("cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not end the call");
    }
  }, [active, updateStatus]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    voiceRef.current?.call.setMuted(next);
    setMuted(next);
  }, [muted]);

  useEffect(() => {
    if (!active?.attemptId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`dialer-attempt-${active.attemptId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_attempts", filter: `id=eq.${active.attemptId}` },
        (payload) => {
          const status = payload.new.status as NormalizedCallStatus;
          setActive((current) => current ? {
            ...current,
            status,
            error: (payload.new.failure_reason as string | null) ?? current.error,
          } : current);
        },
      )
      .subscribe((status) => setRealtimeConnected(status === "SUBSCRIBED"));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [active?.attemptId]);

  useEffect(() => {
    if (realtimeConnected || !active || TERMINAL_CALL_STATUSES.has(active.status)) return;
    const supabase = createClient();
    const timer = window.setInterval(async () => {
      const { data } = await supabase
        .from("call_attempts")
        .select("status, failure_reason")
        .eq("id", active.attemptId)
        .maybeSingle();
      if (data) setActive((current) => current ? {
        ...current,
        status: data.status as NormalizedCallStatus,
        error: data.failure_reason,
      } : current);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [active, realtimeConnected]);

  useEffect(() => () => voiceRef.current?.destroy(), []);

  const value = useMemo<DialerContextValue>(() => ({
    enabled,
    twilioConnected,
    active,
    muted,
    starting,
    realtimeConnected,
    start,
    hangup,
    toggleMute,
    clear: () => {
      voiceRef.current?.destroy();
      voiceRef.current = null;
      setActive(null);
      setMuted(false);
    },
  }), [active, enabled, hangup, muted, realtimeConnected, start, starting, toggleMute, twilioConnected]);

  return <DialerContext.Provider value={value}>{children}</DialerContext.Provider>;
}

export function useDialerSession(): DialerContextValue {
  const value = useContext(DialerContext);
  if (!value) throw new Error("useDialerSession must be used inside DialerSessionProvider");
  return value;
}
