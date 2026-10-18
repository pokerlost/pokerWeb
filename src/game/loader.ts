import { context, event, type GameContext } from './bridge'
import artifact from '../../game-artifact.lock.json'

export interface FlutterApp {
  addView(options: { hostElement: HTMLElement; initialData: GameContext }): number
  removeView(id: number): unknown
}
interface EmbedRuntime {
  engine?: Promise<FlutterApp>
  lease?: object
}
declare global {
  interface Window {
    pokerFlutter?: Promise<FlutterApp>
    pokerEmbedRuntime?: EmbedRuntime
  }
}
const runtime = (window.pokerEmbedRuntime ??= {})

export function loadEngine(): Promise<FlutterApp> {
  if (runtime.engine) return runtime.engine
  runtime.engine = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/game/' + artifact.manifestSha256 + '/flutter_bootstrap.js'
    script.async = true
    const timeout = window.setTimeout(() => reject(new Error('Game assets timed out')), 30000)
    const complete = () => window.clearTimeout(timeout)
    script.onload = () => {
      if (!window.pokerFlutter) {
        complete()
        reject(new Error('Game loader contract unavailable'))
      } else
        window.pokerFlutter.then(
          (app) => {
            complete()
            resolve(app)
          },
          (error: unknown) => {
            complete()
            reject(error)
          },
        )
    }
    script.onerror = () => {
      complete()
      reject(new Error('Game assets unavailable'))
    }
    document.head.append(script)
  })
  return runtime.engine
}
export interface MountedGame {
  update(value: GameContext): void
  dispose(): void
}
export async function mountGame(
  host: HTMLElement,
  value: GameContext,
  signal: AbortSignal,
  notify: (kind: 'ready' | 'error' | 'return') => void,
): Promise<MountedGame> {
  const initial = context(value)
  if (runtime.lease) throw new Error('A game view is already active')
  const ownLease = {}
  runtime.lease = ownLease
  let app: FlutterApp | undefined
  let viewId: number | undefined
  let disposed = false
  let readyTimeout: number | undefined
  let latest = initial
  let ready = false
  const sendContext = () =>
    host.dispatchEvent(new CustomEvent('poker-context', { detail: JSON.stringify(latest) }))
  const dispose = () => {
    if (disposed) return
    disposed = true
    window.clearTimeout(readyTimeout)
    host.removeEventListener('poker-event', receive)
    signal.removeEventListener('abort', dispose)
    if (viewId !== undefined) app!.removeView(viewId)
    if (runtime.lease === ownLease) delete runtime.lease
  }
  const receive = (raw: Event) => {
    if (raw.target !== host || disposed) return
    let message
    try {
      const payload: unknown = JSON.parse((raw as CustomEvent<string>).detail)
      if (
        payload &&
        typeof payload === 'object' &&
        'instance' in payload &&
        payload.instance !== initial.instance
      )
        return
      message = event(payload)
    } catch {
      notify('error')
      return
    }
    if (message.instance !== initial.instance || message.viewId !== viewId) return
    window.clearTimeout(readyTimeout)
    if (message.kind === 'ready') {
      ready = true
      sendContext()
    }
    notify(message.kind)
  }
  signal.addEventListener('abort', dispose, { once: true })
  try {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    app = await loadEngine()
    if (disposed) throw new DOMException('Cancelled', 'AbortError')
    host.addEventListener('poker-event', receive)
    viewId = app.addView({ hostElement: host, initialData: initial })
    readyTimeout = window.setTimeout(() => notify('error'), 30000)
    return {
      dispose,
      update: (value) => {
        const next = context(value)
        if (disposed || next.instance !== initial.instance) throw new Error('Stale game view')
        latest = next
        if (ready) sendContext()
      },
    }
  } catch (error) {
    dispose()
    throw error
  }
}
