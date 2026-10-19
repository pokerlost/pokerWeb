import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { FlutterApp } from "../loader";
const configuration = {
  version: 1 as const,
  instance: "test_1",
  theme: "dark" as const,
  locale: "en" as const,
  preview: false,
};
function fakeApp() {
  return {
    addView: vi.fn<FlutterApp["addView"]>(() => 7),
    removeView: vi.fn<FlutterApp["removeView"]>(),
  } satisfies FlutterApp;
}
function ready(host: HTMLElement, fields: Record<string, unknown> = {}) {
  host.dispatchEvent(
    new CustomEvent("poker-event", {
      detail: JSON.stringify({
        version: 1,
        instance: "test_1",
        viewId: 7,
        kind: "ready",
        capabilities: ["preview", "theme", "return"],
        ...fields,
      }),
    }),
  );
}
beforeEach(() => {
  vi.resetModules();
  document.head.innerHTML = "";
  delete window.pokerFlutter;
  delete window.pokerEmbedRuntime;
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  document.body.innerHTML = "";
});
async function attached() {
  const api = await import("../loader");
  const app = fakeApp();
  window.pokerFlutter = Promise.resolve(app);
  const host = document.createElement("div");
  document.body.append(host);
  const abort = new AbortController();
  const notify = vi.fn<(kind: string) => void>();
  const pending = api.mountGame(host, configuration, abort.signal, notify);
  document.querySelector("script")!.dispatchEvent(new Event("load"));
  const mounted = await pending;
  return { api, app, host, abort, notify, mounted };
}
it("loads once, handles ready/settings/return, discards old events and cleans once", async () => {
  const { api, app, host, abort, notify, mounted } = await attached();
  expect(app.addView).toHaveBeenCalledWith({ hostElement: host, initialData: configuration });
  expect(api.loadEngine()).toBe(api.loadEngine());
  expect(document.querySelectorAll("script")).toHaveLength(1);
  const updates: string[] = [];
  host.addEventListener("poker-context", raw => updates.push((raw as CustomEvent<string>).detail));
  mounted.update({ ...configuration, preview: true, theme: "light" });
  expect(updates).toHaveLength(0);
  ready(host);
  expect(notify).toHaveBeenLastCalledWith("ready");
  expect(JSON.parse(updates[0]!).preview).toBe(true);
  mounted.update(configuration);
  expect(JSON.parse(updates[1]!).theme).toBe("dark");
  ready(host, { instance: "old", version: 99 });
  ready(host, { viewId: 99 });
  expect(notify).toHaveBeenCalledTimes(1);
  ready(host, { kind: "return" });
  expect(notify).toHaveBeenLastCalledWith("return");
  ready(host, { kind: "error" });
  expect(notify).toHaveBeenLastCalledWith("error");
  host.dispatchEvent(new CustomEvent("poker-event", { detail: "{bad JSON" }));
  host.dispatchEvent(new CustomEvent("poker-event", { detail: JSON.stringify(null) }));
  ready(host, { version: 99 });
  expect(notify).toHaveBeenLastCalledWith("error");
  const child = document.createElement("span");
  host.append(child);
  child.dispatchEvent(new CustomEvent("poker-event", { bubbles: true, detail: "{}" }));
  const calls = notify.mock.calls.length;
  abort.abort();
  mounted.dispose();
  ready(host);
  expect(notify).toHaveBeenCalledTimes(calls);
  expect(app.removeView).toHaveBeenCalledExactlyOnceWith(7);
  expect(() => mounted.update(configuration)).toThrow("Stale");
});
it("rejects two active mounts and mismatched update identity", async () => {
  const first = await attached();
  await expect(
    first.api.mountGame(
      document.createElement("div"),
      configuration,
      new AbortController().signal,
      vi.fn(),
    ),
  ).rejects.toThrow("already active");
  expect(() => first.mounted.update({ ...configuration, instance: "changed" })).toThrow("Stale");
  first.mounted.dispose();
  const second = await first.api.mountGame(
    document.createElement("div"),
    configuration,
    new AbortController().signal,
    vi.fn(),
  );
  second.dispose();
  expect(first.app.addView).toHaveBeenCalledTimes(2);
});
it("cancels before loading without a view or script", async () => {
  const api = await import("../loader");
  const abort = new AbortController();
  abort.abort();
  await expect(
    api.mountGame(document.createElement("div"), configuration, abort.signal, vi.fn()),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(document.querySelector("script")).toBeNull();
});
it("cancels during download and reuses one promise across a module reload", async () => {
  const api = await import("../loader");
  const app = fakeApp();
  const abort = new AbortController();
  const pending = api
    .mountGame(document.createElement("div"), configuration, abort.signal, vi.fn())
    .catch((error: unknown) => error);
  const promise = api.loadEngine();
  abort.abort();
  vi.resetModules();
  expect((await import("../loader")).loadEngine()).toBe(promise);
  window.pokerFlutter = Promise.resolve(app);
  document.querySelector("script")!.dispatchEvent(new Event("load"));
  expect(await pending).toMatchObject({ name: "AbortError" });
  expect(app.addView).not.toHaveBeenCalled();
});
it("reports a missing asset and keeps one failed engine until page reload", async () => {
  const api = await import("../loader");
  const promise = api.loadEngine();
  const failed = promise.catch((error: unknown) => error);
  document.querySelector("script")!.dispatchEvent(new Event("error"));
  expect(await failed).toMatchObject({ message: "Game assets unavailable" });
  expect(api.loadEngine()).toBe(promise);
  expect(document.querySelectorAll("script")).toHaveLength(1);
});
it("rejects missing bootstrap API and SDK initialization failures", async () => {
  let api = await import("../loader");
  let pending = api.loadEngine();
  let failed = pending.catch((error: unknown) => error);
  document.querySelector("script")!.dispatchEvent(new Event("load"));
  expect(await failed).toMatchObject({ message: "Game loader contract unavailable" });
  vi.resetModules();
  delete window.pokerEmbedRuntime;
  document.head.innerHTML = "";
  api = await import("../loader");
  window.pokerFlutter = Promise.reject(new Error("synthetic engine failure"));
  pending = api.loadEngine();
  failed = pending.catch((error: unknown) => error);
  document.querySelector("script")!.dispatchEvent(new Event("load"));
  expect(await failed).toMatchObject({ message: "synthetic engine failure" });
});
it("bounds script and initialization timeouts", async () => {
  vi.useFakeTimers();
  const api = await import("../loader");
  const pending = api.loadEngine();
  const failed = pending.catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(30001);
  expect(await failed).toMatchObject({ message: "Game assets timed out" });
});
it("bounds view readiness and disposes on framework addView failure", async () => {
  vi.useFakeTimers();
  const first = await attached();
  await vi.advanceTimersByTimeAsync(30001);
  expect(first.notify).toHaveBeenLastCalledWith("error");
  first.mounted.dispose();
  first.app.addView.mockImplementation(() => {
    throw new Error("synthetic framework error");
  });
  await expect(
    first.api.mountGame(
      document.createElement("div"),
      configuration,
      new AbortController().signal,
      vi.fn(),
    ),
  ).rejects.toThrow("synthetic framework error");
});
