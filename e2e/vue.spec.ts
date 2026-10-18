import { test, expect, type Page } from '@playwright/test'
async function preview(page: Page) {
  await page.goto('/game')
  await page.getByLabel('Synthetic preview', { exact: true }).check()
  await expect(page.getByText('Preview · synthetic data', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Board card Ah')).toBeVisible()
  await expect
    .poll(() => page.getByRole('region', { name: 'Game area' }).ariaSnapshot())
    .toContain('North Seat 1 · 980 preview chips Hidden cards')
}

test('lazy loads the actual Flutter bundle, renders data and returns through the shared widget', async ({
  page,
  baseURL,
}) => {
  const external: string[] = []
  const origin = new URL(baseURL!).origin
  const scripts: string[] = [],
    errors: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin)
      external.push(url.origin)
    if (request.url().endsWith('/flutter_bootstrap.js')) scripts.push(request.url())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A place for the next hand.')
  expect(scripts).toHaveLength(0)
  await page.getByRole('link', { name: 'Explore the table' }).click()
  await expect(page.getByText('Game service unavailable', { exact: true })).toBeVisible()
  await page.getByLabel('Synthetic preview', { exact: true }).check()
  await expect(page.getByText('Preview · synthetic data', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Board card Ah')).toBeVisible()
  await expect
    .poll(() => page.getByRole('region', { name: 'Game area' }).ariaSnapshot())
    .toContain('North Seat 1 · 980 preview chips Hidden cards')
  await expect(page).toHaveURL('/game')
  expect(scripts).toHaveLength(1)
  await page.getByRole('button', { name: 'Return', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('flutter-view')).toHaveCount(0)
  await page.getByRole('link', { name: 'Table', exact: true }).click()
  await expect(page.getByText('Game service unavailable', { exact: true })).toBeVisible()
  await expect(page.locator('flutter-view')).toHaveCount(1)
  expect(scripts).toHaveLength(1)
  expect(errors).toEqual([])
  expect([...new Set(external)]).toEqual([])
})

test('cancels slow real asset loading and re-enters without a leaked engine or view', async ({
  page,
}) => {
  let release!: () => void
  const wait = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/flutter_bootstrap.js', async (route) => {
    await wait
    await route.continue()
  })
  await page.goto('/game')
  await expect(page.getByRole('status')).toHaveText('Loading the game area…')
  await page.getByLabel('Synthetic preview', { exact: true }).check()
  await page.getByRole('link', { name: 'Platform status' }).click()
  release()
  await expect(page.locator('flutter-view')).toHaveCount(0)
  await page.getByRole('link', { name: 'Table', exact: true }).click()
  await page.getByLabel('Synthetic preview', { exact: true }).check()
  await page.getByLabel('Dark table', { exact: true }).uncheck()
  await expect(page.getByText('Preview · synthetic data', { exact: true })).toBeVisible()
  await expect(page.locator('flutter-view')).toHaveCount(1)
  await expect(page.locator('script[src$="/flutter_bootstrap.js"]')).toHaveCount(1)
})

test('renders responsively with actual semantics, keyboard focus and fullscreen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await preview(page)
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390)
  await page.getByLabel('Poker table', { exact: true }).focus()
  await expect(page.getByLabel('Poker table', { exact: true })).toBeFocused()
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false)
  await page.screenshot({ path: 'test-results/table-desktop.png', fullPage: true })
  await expect(page.getByLabel('Board card Ah')).toBeVisible()
})

test('reports a real missing Flutter asset without a blank game area', async ({ page }) => {
  await page.route('**/flutter_bootstrap.js', (route) =>
    route.fulfill({ status: 404, body: 'missing artifact' }),
  )
  await page.goto('/game')
  await expect(page.getByRole('alert')).toHaveText(
    'The game area could not load. Reload the page to retry.',
  )
  await page.getByRole('link', { name: 'Platform status' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What is available today')
})

test('rejects incompatible context at the actual Dart boundary and recovers with valid settings', async ({
  page,
}) => {
  await preview(page)
  await page.evaluate(() => {
    const host = document.querySelector('.game-host')!
    host.dispatchEvent(
      new CustomEvent('poker-context', { detail: JSON.stringify({ version: 99 }) }),
    )
  })
  await expect(page.getByText('Invalid game context', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByLabel('Dark table', { exact: true }).uncheck()
  await expect(page.getByText('Preview · synthetic data', { exact: true })).toBeVisible()
})

test('ignores events from a removed view and validates active bridge capabilities', async ({
  page,
}) => {
  await page.addInitScript(() => {
    document.addEventListener(
      'poker-event',
      (raw) => {
        const detail = (raw as CustomEvent<string>).detail
        ;(window as Window & { observed?: string }).observed = detail
      },
      { capture: true },
    )
  })
  await preview(page)
  const old = await page.evaluate(() => (window as Window & { observed?: string }).observed!)
  expect(JSON.parse(old).kind).toBe('ready')
  await page.getByRole('link', { name: 'Platform status' }).click()
  await page.getByRole('link', { name: 'Table', exact: true }).click()
  await expect(page.getByText('Game service unavailable', { exact: true })).toBeVisible()
  const current = await page.evaluate(() => (window as Window & { observed?: string }).observed!)
  await page.evaluate(
    (detail) =>
      document
        .querySelector('.game-host')!
        .dispatchEvent(new CustomEvent('poker-event', { detail })),
    old,
  )
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.evaluate((detail) => {
    const current = JSON.parse(detail)
    document.querySelector('.game-host')!.dispatchEvent(
      new CustomEvent('poker-event', {
        detail: JSON.stringify({ ...current, capabilities: [] }),
      }),
    )
  }, current)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL('/game')
})

test('the real Dart view removes its listener and rejects stale or bubbled contexts', async ({
  page,
}) => {
  await page.addInitScript(() => {
    document.addEventListener(
      'poker-event',
      (raw) => {
        const detail = (raw as CustomEvent<string>).detail
        ;(window as Window & { observed?: string }).observed = detail
      },
      { capture: true },
    )
  })
  await preview(page)
  await page.evaluate(() => {
    const state = window as Window & { retiredHost?: HTMLElement; retiredEvents?: number }
    state.retiredHost = document.querySelector<HTMLElement>('.game-host')!
    state.retiredEvents = 0
    state.retiredHost.addEventListener('poker-event', () => state.retiredEvents!++)
  })
  await page.getByRole('link', { name: 'Platform status' }).click()
  await expect(page.locator('flutter-view')).toHaveCount(0)
  await page.getByRole('link', { name: 'Table', exact: true }).click()
  await page.getByLabel('Synthetic preview', { exact: true }).check()
  await expect(page.getByText('Preview · synthetic data', { exact: true })).toBeVisible()
  await page.evaluate(() => {
    const state = window as Window & { retiredHost?: HTMLElement }
    state.retiredHost!.dispatchEvent(new CustomEvent('poker-context', { detail: '{invalid' }))
  })
  expect(
    await page.evaluate(() => (window as Window & { retiredEvents?: number }).retiredEvents),
  ).toBe(0)
  await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>('.game-host')!
    const child = document.createElement('span')
    host.append(child)
    child.dispatchEvent(new CustomEvent('poker-context', { bubbles: true, detail: '{invalid' }))
    child.remove()
  })
  await expect(page.getByText('Preview · synthetic data', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.evaluate(() => {
    const state = window as Window & { observed?: string }
    const event = JSON.parse(state.observed!) as { instance: string }
    document.querySelector('.game-host')!.dispatchEvent(
      new CustomEvent('poker-context', {
        detail: JSON.stringify({
          version: 1,
          instance: event.instance + '_stale',
          theme: 'dark',
          locale: 'en',
          preview: true,
        }),
      }),
    )
  })
  await expect(page.getByText('Invalid game context', { exact: true })).toBeVisible()
  await page.getByLabel('Dark table', { exact: true }).uncheck()
  await expect(page.getByText('Preview · synthetic data', { exact: true })).toBeVisible()
  await expect(page.locator('flutter-view')).toHaveCount(1)
})
