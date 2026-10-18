export const bridgeVersion = 1 as const
export interface GameContext {
  version: 1
  instance: string
  theme: 'light' | 'dark'
  locale: 'en'
  preview: boolean
}
export interface GameEvent {
  version: 1
  instance: string
  viewId: number
  kind: 'ready' | 'error' | 'return'
  capabilities: ['preview', 'theme', 'return']
}
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error('Invalid bridge object')
  return value as Record<string, unknown>
}
export function context(value: unknown): GameContext {
  const data = record(value, ['version', 'instance', 'theme', 'locale', 'preview'])
  if (
    data.version !== bridgeVersion ||
    typeof data.instance !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(data.instance) ||
    typeof data.theme !== 'string' ||
    !['light', 'dark'].includes(data.theme) ||
    data.locale !== 'en' ||
    typeof data.preview !== 'boolean'
  )
    throw new Error('Incompatible game context')
  return { ...data } as unknown as GameContext
}
export function event(value: unknown): GameEvent {
  const data = record(value, ['version', 'instance', 'viewId', 'kind', 'capabilities'])
  if (
    data.version !== bridgeVersion ||
    typeof data.instance !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(data.instance) ||
    !Number.isSafeInteger(data.viewId) ||
    Number(data.viewId) < 0 ||
    typeof data.kind !== 'string' ||
    !['ready', 'error', 'return'].includes(data.kind) ||
    JSON.stringify(data.capabilities) !== '["preview","theme","return"]'
  )
    throw new Error('Invalid game event')
  return data as unknown as GameEvent
}
