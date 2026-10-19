import { z } from "zod";

export const bridgeVersion = 1 as const;
export const gameTheme = { light: "light", dark: "dark" } as const;
export const gameEventKind = { ready: "ready", error: "error", return: "return" } as const;
export const bridgeChannel = { context: "poker-context", event: "poker-event" } as const;
export type GameTheme = (typeof gameTheme)[keyof typeof gameTheme];
export type GameEventKind = (typeof gameEventKind)[keyof typeof gameEventKind];

const instance = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const contextSchema = z.strictObject({
  version: z.literal(bridgeVersion),
  instance,
  theme: z.enum(gameTheme),
  locale: z.literal("en"),
  preview: z.boolean(),
});
const eventFields = {
  version: z.literal(bridgeVersion),
  instance,
  viewId: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  capabilities: z.tuple([z.literal("preview"), z.literal("theme"), z.literal("return")]),
};
const eventSchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...eventFields, kind: z.literal(gameEventKind.ready) }),
  z.strictObject({ ...eventFields, kind: z.literal(gameEventKind.error) }),
  z.strictObject({ ...eventFields, kind: z.literal(gameEventKind.return) }),
]);
export type GameContext = z.infer<typeof contextSchema>;
export type GameEvent = z.infer<typeof eventSchema>;

export function context(value: unknown): GameContext {
  const result = contextSchema.safeParse(value);
  // Reject inherited fields just as the v1 wire contract requires. Zod owns
  // types/shape constraints; this boundary owns own-property transport semantics.
  if (!result.success || !value || typeof value !== "object"
    || !Object.keys(result.data).every(key => Object.hasOwn(value, key)))
    throw new Error("Incompatible game context");
  return result.data;
}
export function event(value: unknown): GameEvent {
  const result = eventSchema.safeParse(value);
  if (!result.success || !value || typeof value !== "object"
    || !Object.keys(result.data).every(key => Object.hasOwn(value, key)))
    throw new Error("Invalid game event");
  return result.data;
}
