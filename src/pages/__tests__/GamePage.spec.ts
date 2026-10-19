import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import GamePage from "../GamePage.vue";
import router from "../../router";
import type { FlutterApp } from "../../game/loader";
const app = {
  addView: vi.fn<FlutterApp["addView"]>(() => 9),
  removeView: vi.fn<FlutterApp["removeView"]>(),
};
let wrapper: VueWrapper;
const request = vi.fn<(this: HTMLElement) => Promise<void>>(function () {
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: this });
  return Promise.resolve();
});
const exit = vi.fn<() => Promise<void>>(() => {
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
  return Promise.resolve();
});
beforeEach(async () => {
  window.pokerEmbedRuntime!.engine = Promise.resolve(app);
  app.addView.mockClear();
  app.removeView.mockClear();
  request.mockClear();
  exit.mockClear();
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: null,
  });
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
    configurable: true,
    value: request,
  });
  Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exit });
  await router.push("/game");
  wrapper = mount(GamePage, { global: { plugins: [router] } });
  await flushPromises();
});
afterEach(() => wrapper.unmount());
it("updates preview/theme and returns through actual bridge events", async () => {
  const input = app.addView.mock.calls[0]![0];
  const messages: string[] = [];
  input.hostElement.addEventListener("poker-context", raw =>
    messages.push((raw as CustomEvent<string>).detail),
  );
  const send = (kind: string) =>
    input.hostElement.dispatchEvent(
      new CustomEvent("poker-event", {
        detail: JSON.stringify({
          version: 1,
          instance: input.initialData.instance,
          viewId: 9,
          kind,
          capabilities: ["preview", "theme", "return"],
        }),
      }),
    );
  send("ready");
  const checks = wrapper.findAll("input");
  await checks[0]!.setValue(true);
  await checks[1]!.setValue(false);
  expect(JSON.parse(messages.at(-1)!)).toMatchObject({ theme: "light", preview: true });
  send("return");
  await flushPromises();
  expect(router.currentRoute.value.path).toBe("/");
});
it("handles fullscreen enter/exit and recovers from browser denial", async () => {
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(document.fullscreenElement).toBe(wrapper.element);
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(exit).toHaveBeenCalledOnce();
  expect(document.fullscreenElement).toBeNull();
  request.mockRejectedValueOnce(new Error("synthetic denial"));
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(wrapper.text()).toContain("Fullscreen is unavailable");
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(wrapper.text()).not.toContain("Fullscreen is unavailable");
});
