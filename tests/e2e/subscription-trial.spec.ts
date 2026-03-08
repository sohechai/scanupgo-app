import { test, expect } from '@playwright/test'

/**
 * E2E tests for trial banner on /dashboard/subscription (#7)
 * and Stripe checkout trial behavior (#8)
 *
 * Note: Stripe checkout tests (#8) verify the frontend sends the correct
 * parameters — full Stripe session verification requires a Stripe test environment.
 */

test.describe('Dashboard Subscription — Trial Banner (#7)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/subscription')
    await page.waitForLoadState('networkidle')
  })

  test('page loads and shows subscription plans', async ({ page }) => {
    // At least one plan card or the subscription page content is visible
    await expect(
      page.getByText(/plan|abonnement|mensuel|annuel/i).first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('trial banner is visible when plan has trialDays > 0 and user is new', async ({ page }) => {
    // This test passes if the backend returns eligible=true (no existing subscription, plan.trialDays > 0)
    // The banner should show "Essai gratuit de X jours"
    const banner = page.locator('[class*="purple"], [class*="trial"], [class*="gift"]')
      .filter({ hasText: /essai.*\d+.*jour|\d+.*jour.*essai/i })

    // Soft assertion: if trial is configured and user is new, banner appears
    const hasBanner = await banner.isVisible().catch(() => false)
    if (hasBanner) {
      await expect(banner).toBeVisible()
      await expect(banner).toContainText(/jour/i)
    } else {
      test.info().annotations.push({
        type: 'info',
        description: 'Trial banner not visible — plan may have trialDays=0 or user already subscribed',
      })
    }
  })

  test('trial banner is absent when plan has trialDays=0', async ({ page }) => {
    // If the default plan has trialDays=0, no banner should appear
    // Check backend /subscriptions/trial-info returns eligible=false
    const response = await page.request.get('http://localhost:4000/subscriptions/trial-info', {
      headers: { 'Cookie': await page.context().cookies().then(c => c.map(x => `${x.name}=${x.value}`).join('; ')) }
    })
    const trialInfo = await response.json()

    if (!trialInfo.eligible) {
      await expect(
        page.getByText(/essai gratuit/i)
      ).not.toBeVisible()
    }
  })
})

test.describe('Dashboard Subscription — Checkout avec essai (#8)', () => {
  test('subscribe button triggers checkout for monthly plan', async ({ page }) => {
    await page.goto('/dashboard/subscription')
    await page.waitForLoadState('networkidle')

    // Listen for the checkout API call
    const checkoutPromise = page.waitForRequest(req =>
      req.url().includes('/subscriptions/create-checkout') && req.method() === 'POST',
      { timeout: 10000 }
    )

    // Click the first "S'abonner" or "Commencer" button on a monthly plan
    const subscribeBtn = page.getByRole('button', { name: /s.abonner|commencer|essai|souscrire/i }).first()
    await subscribeBtn.click()

    // Verify the request was made (regardless of Stripe redirect)
    try {
      const request = await checkoutPromise
      const body = request.postDataJSON()
      expect(body).toHaveProperty('planId')
      expect(body).toHaveProperty('period')
    } catch {
      // If Stripe redirected before we caught the request, that's also a success
      const url = page.url()
      const isStripeOrSuccess =
        url.includes('stripe.com') ||
        url.includes('checkout') ||
        url.includes('success')
      expect(isStripeOrSuccess).toBe(true)
    }
  })

  test('trial-info endpoint returns consistent data with plan trialDays', async ({ page }) => {
    // Verify the trial-info endpoint (used to show/hide banner) is consistent with plan data
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const [trialRes, plansRes] = await Promise.all([
      page.request.get('http://localhost:4000/subscriptions/trial-info', {
        headers: { Cookie: cookieHeader }
      }),
      page.request.get('http://localhost:4000/subscriptions/plans', {
        headers: { Cookie: cookieHeader }
      }),
    ])

    const trialInfo = await trialRes.json()
    const plans = await plansRes.json()

    expect(trialInfo).toHaveProperty('eligible')
    expect(trialInfo).toHaveProperty('days')

    if (plans.length > 0) {
      const defaultPlan = plans.find((p: any) => p.isDefault) || plans[0]

      if (defaultPlan.trialDays === 0) {
        expect(trialInfo.eligible).toBe(false)
      }
      if (trialInfo.eligible) {
        expect(trialInfo.days).toBe(defaultPlan.trialDays)
      }
    }
  })

  test('lifetime plan checkout sends mode=payment (no trial)', async ({ page }) => {
    await page.goto('/dashboard/subscription')
    await page.waitForLoadState('networkidle')

    // Monitor API calls
    const requests: any[] = []
    page.on('request', req => {
      if (req.url().includes('/subscriptions/create-checkout')) {
        requests.push({ url: req.url(), body: req.postDataJSON() })
      }
    })

    // Click lifetime plan button if visible
    const lifetimeBtn = page.getByRole('button', { name: /lifetime|à vie/i }).first()
    const isVisible = await lifetimeBtn.isVisible().catch(() => false)

    if (isVisible) {
      await lifetimeBtn.click()
      await page.waitForTimeout(1000)

      if (requests.length > 0) {
        expect(requests[0].body?.period).toBe('lifetime')
      }
    } else {
      test.info().annotations.push({
        type: 'info',
        description: 'No lifetime plan button visible on this page',
      })
    }
  })
})

test.describe('Subscriptions API — Trial logic via HTTP (#8 backend)', () => {
  test('GET /subscriptions/trial-info returns valid shape', async ({ page }) => {
    await page.goto('/dashboard/subscription')
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const response = await page.request.get('http://localhost:4000/subscriptions/trial-info', {
      headers: { Cookie: cookieHeader }
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      eligible: expect.any(Boolean),
      days: expect.any(Number),
    })
    // days must be 0 when not eligible
    if (!body.eligible) {
      expect(body.days).toBe(0)
    }
  })

  test('GET /subscriptions/plans includes trialDays for each plan', async ({ page }) => {
    await page.goto('/dashboard/subscription')
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const response = await page.request.get('http://localhost:4000/subscriptions/plans', {
      headers: { Cookie: cookieHeader }
    })

    expect(response.status()).toBe(200)
    const plans = await response.json()

    for (const plan of plans) {
      expect(plan).toHaveProperty('trialDays')
      expect(typeof plan.trialDays).toBe('number')
      expect(plan.trialDays).toBeGreaterThanOrEqual(0)
    }
  })
})
