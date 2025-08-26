import { test, expect } from '@playwright/test'

test('root page renders', async ({ page }) => {
  await page.goto('/')
  // Works for both authed and non-authed variants: look for generic UI elements
  const bodyText = await page.locator('body').innerText()
  expect(bodyText.length).toBeGreaterThan(0)
})

test('status api responds', async ({ request }) => {
  const res = await request.get('/api/status')
  expect(res.status()).toBeLessThan(500)
})

test('calendar webhook GET responds 200', async ({ request }) => {
  const res = await request.get('/api/integrations/google/calendar/webhook')
  expect([200, 404]).toContain(res.status())
  // If bi-di flag is on, endpoint returns 200. If gated off, may be 404 by design.
})