import { after } from "next/server";

/**
 * Runs work after the response is sent. Inside a request, Next keeps the
 * process alive for it via after(); outside one (scripts, tests) it falls back
 * to a detached promise.
 */
export function runAfterResponse(label: string, work: () => Promise<unknown>) {
  const guarded = async () => {
    try {
      await work();
    } catch (error) {
      console.error(`${label} failed:`, error);
    }
  };
  try {
    after(guarded);
  } catch {
    void guarded();
  }
}
