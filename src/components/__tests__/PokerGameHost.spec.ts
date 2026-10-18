import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import PokerGameHost from '../PokerGameHost.vue'
import type { FlutterApp } from '../../game/loader'
let wrapper: VueWrapper | undefined
const app = {
  addView: vi.fn<FlutterApp['addView']>(() => 3),
  removeView: vi.fn<FlutterApp['removeView']>(),
} satisfies FlutterApp
beforeEach(() => {
  app.addView.mockClear()
  app.removeView.mockClear()
  window.pokerEmbedRuntime!.engine = Promise.resolve(app)
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})
function message(kind: string) {
  const input = app.addView.mock.calls[0]![0]
  input.hostElement.dispatchEvent(
    new CustomEvent('poker-event', {
      detail: JSON.stringify({
        version: 1,
        instance: input.initialData.instance,
        viewId: 3,
        kind,
        capabilities: ['preview', 'theme', 'return'],
      }),
    }),
  )
}
it('renders loading, ready, changed settings, return and exact cleanup', async () => {
  wrapper = mount(PokerGameHost, { props: { preview: false, theme: 'dark' } })
  expect(wrapper.get('[role="status"]').text()).toContain('Loading')
  await flushPromises()
  const host = app.addView.mock.calls[0]![0].hostElement
  const values: string[] = []
  host.addEventListener('poker-context', (raw) => values.push((raw as CustomEvent<string>).detail))
  message('ready')
  await flushPromises()
  expect(wrapper.attributes('aria-busy')).toBe('false')
  await wrapper.setProps({ preview: true, theme: 'light' })
  expect(JSON.parse(values.at(-1)!).preview).toBe(true)
  message('return')
  expect(wrapper.emitted('return')).toHaveLength(1)
  message('error')
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('could not load')
  wrapper.unmount()
  wrapper = undefined
  expect(app.removeView).toHaveBeenCalledExactlyOnceWith(3)
})
it('cancels a slow download and ignores late initialization', async () => {
  let resolve!: (value: FlutterApp) => void
  window.pokerEmbedRuntime!.engine = new Promise((done) => {
    resolve = done
  })
  wrapper = mount(PokerGameHost, { props: { preview: false, theme: 'dark' } })
  await wrapper.setProps({ preview: true })
  wrapper.unmount()
  wrapper = undefined
  resolve(app)
  await flushPromises()
  expect(app.addView).not.toHaveBeenCalled()
})
it('keeps setting changes made during loading and handles initialization failure', async () => {
  let resolve!: (value: FlutterApp) => void
  window.pokerEmbedRuntime!.engine = new Promise((done) => {
    resolve = done
  })
  wrapper = mount(PokerGameHost, { props: { preview: false, theme: 'dark' } })
  await wrapper.setProps({ preview: true, theme: 'light' })
  resolve(app)
  await flushPromises()
  const host = app.addView.mock.calls[0]![0].hostElement
  let latest = ''
  host.addEventListener('poker-context', (raw) => {
    latest = (raw as CustomEvent<string>).detail
  })
  message('ready')
  expect(JSON.parse(latest).preview).toBe(true)
  wrapper.unmount()
  wrapper = undefined
  window.pokerEmbedRuntime!.engine = Promise.reject(new Error('synthetic load failure'))
  wrapper = mount(PokerGameHost, { props: { preview: false, theme: 'dark' } })
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('could not load')
})
