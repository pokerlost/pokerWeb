import { describe, expect, it } from "vitest";
import { context, event } from "../bridge";
const configuration = { version: 1, instance: "test_1", theme: "dark", locale: "en", preview: true };
const message = {
  version: 1,
  instance: "test_1",
  viewId: 7,
  kind: "ready",
  capabilities: ["preview", "theme", "return"],
};
describe("small runtime-validated Dart/TypeScript bridge declarations", () => {
  it("copies supported context without retaining caller mutation", () => {
    const source = { ...configuration };
    const parsed = context(source);
    source.instance = "changed";
    expect(parsed.instance).toBe("test_1");
    expect(context({ ...configuration, preview: false, theme: "light" }).preview).toBe(false);
  });
  for (const invalid of [
    null,
    false,
    1,
    [],
    "text",
    {},
    { ...configuration, secret: "synthetic" },
    Object.create(configuration),
    { ...configuration, instance: "bad id" },
    { ...configuration, instance: "x".repeat(65) },
    { ...configuration, instance: 1 },
    { ...configuration, version: 2 },
    { ...configuration, theme: ["dark"] },
    { ...configuration, theme: "system" },
    { ...configuration, locale: "ru" },
    { ...configuration, preview: "true" },
  ]) {
    it("rejects malformed or incompatible context", () => {
      expect(() => context(invalid)).toThrow(/Invalid|Incompatible/);
    });
  }
  for (const kind of ["ready", "error", "return"]) {
    it("accepts a supported event and capability handshake", () => {
      expect(event({ ...message, kind }).kind).toBe(kind);
    });
  }
  for (const invalid of [
    null,
    [],
    { ...message, version: 0 },
    { ...message, instance: 1 },
    { ...message, instance: "bad id" },
    { ...message, viewId: 1.5 },
    { ...message, viewId: -1 },
    { ...message, kind: ["ready"] },
    { ...message, kind: "frame" },
    { ...message, capabilities: [] },
    { ...message, token: "synthetic" },
  ]) {
    it("rejects malformed events rather than creating a game-state bus", () => {
      expect(() => event(invalid)).toThrow(/Invalid|Incompatible/);
    });
  }
});
