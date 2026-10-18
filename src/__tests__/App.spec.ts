import { afterEach, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import router from '../router'
let stop: (() => void) | undefined
afterEach(() => {
  stop?.()
  document.body.innerHTML = ''
})
it('boots the actual site, exposes navigation and resolves unknown pages', async () => {
  history.replaceState(null, '', '/')
  document.body.innerHTML = '<div id="app"></div>'
  const { app } = await import('../main')
  stop = () => app.unmount()
  await router.isReady()
  await flushPromises()
  expect(document.body.textContent).toContain('A place for the next hand.')
  expect(document.querySelector('a[href="#content"]')).not.toBeNull()
  await router.push('/about')
  await flushPromises()
  expect(document.body.textContent).toContain('No login, wallet, wagering or live game service')
  await router.push('/unknown')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/')
})
