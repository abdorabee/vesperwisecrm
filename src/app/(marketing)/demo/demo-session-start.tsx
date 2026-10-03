"use client";

import { useEffect, useRef } from "react";
import { enterDemoWorkspace } from "@/lib/actions/demo";

export function DemoSessionStart() {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center px-4 py-28 sm:px-7">
      <p className="font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-[var(--mkt-text3)] uppercase">
        Sample workspace
      </p>
      <h1 className="mt-4 font-sans text-4xl leading-none font-normal tracking-[-0.03em] text-[var(--mkt-text)]">
        Opening the demo
      </h1>
      <p className="mt-4 text-base leading-7 text-[var(--mkt-text2)]">
        Fictional sellers only. You can look through the pipeline, queue, and a lead. Changes are turned off.
      </p>
      <form ref={formRef} action={enterDemoWorkspace} className="mt-8">
        <button
          type="submit"
          className="rounded-md bg-[var(--mkt-accent)] px-5 py-3.5 font-sans text-sm leading-none font-medium text-[var(--mkt-accent-ink)] transition-[background,transform] duration-150 ease-out hover:bg-[var(--mkt-accent-hover)] active:scale-[0.96]"
        >
          Open the sample workspace
        </button>
      </form>
    </div>
  );
}
