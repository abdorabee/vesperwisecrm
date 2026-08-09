import type { Call, Device } from "@twilio/voice-sdk";

export interface BrowserCallHandlers {
  onStatus: (status: "ringing" | "answered" | "completed" | "failed") => void;
  onError: (message: string) => void;
}

export interface BrowserVoiceCall {
  disconnect(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

export interface BrowserVoiceSession {
  call: BrowserVoiceCall;
  destroy(): void;
}

export async function connectTwilioBrowserCall(
  token: string,
  params: Record<string, string>,
  handlers: BrowserCallHandlers,
): Promise<BrowserVoiceSession> {
  const { Device: TwilioDevice } = await import("@twilio/voice-sdk");
  const device: Device = new TwilioDevice(token, {
    closeProtection: true,
    logLevel: "warn",
  });
  device.on("error", (error) => handlers.onError(error.message));
  const activeCall: Call = await device.connect({ params });
  activeCall.on("ringing", () => handlers.onStatus("ringing"));
  activeCall.on("accept", () => handlers.onStatus("answered"));
  activeCall.on("disconnect", () => handlers.onStatus("completed"));
  activeCall.on("cancel", () => handlers.onStatus("completed"));
  activeCall.on("reject", () => handlers.onStatus("failed"));
  activeCall.on("error", (error) => handlers.onError(error.message));

  return {
    call: {
      disconnect: () => activeCall.disconnect(),
      setMuted: (muted) => activeCall.mute(muted),
      isMuted: () => activeCall.isMuted(),
    },
    destroy: () => device.destroy(),
  };
}
