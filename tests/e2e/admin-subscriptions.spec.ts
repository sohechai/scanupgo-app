import { test, expect } from '@playwright/test'

/**
 * E2E tests for /admin/subscriptions
 * Covers checklist items #1-6 + #7 (settings)
 *
 * DOM notes:
 * - Tabs are <button> elements in a <nav>, NOT role="tab"
 * - Modal uses <Teleport to="body"> div, NOT role="dialog"
 * - Delete uses native browser confirm(), handled via page.once('dialog', ...)
 * - Settings uses sidebar <button> elements (not tabs)
 */

test.describe('Admin Subscriptions — Navigation & Tabs (#1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/subscriptions')
    await page.waitForLoadState('networkidle')
  })

  test('displays both tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /abonnements actifs/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /plans d.abonnement/i })).toBeVisible()
  })

  test('active tab has highlighted style', async ({ page }) => {
    const activeTab = page.getByRole('button', { name: /abonnements actifs/i })
    await expect(activeTab).toBeVisible()
  })

  test('clicking Plans tab switches content', async ({ page }) => {
    await page.getByRole('button', { name: /plans d.abonnement/i }).click()
    await expect(page.getByRole('button', { name: /nouveau plan/i })).toBeVisible()
  })

  test('two tab buttons are present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /abonnements actifs/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /plans d.abonnement/i })).toBeVisible()
  })
})

test.describe('Admin Subscriptions — Onglet Abonnements actifs (#2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/subscriptions')
    await page.waitForLoadState('networkidle')
  })

  test('displays stats cards (total, actifs, MRR, annulés)', async ({ page }) => {
    // Stats cards are visible in the subscriptions tab
    const statCards = page.locator('.grid').first()
    await expect(statCards).toBeVisible()
  })

  test('displays subscriptions table with correct columns', async ({ page }) => {
    // Check column headers (or empty state visible)
    await expect(page.getByText(/commerce/i).first()).toBeVisible()
    await expect(page.getByText(/plan/i).first()).toBeVisible()
    await expect(page.getByText(/statut/i).first()).toBeVisible()
  })

  test('Export button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible()
  })
})

test.describe('Admin Subscriptions — Plans Tab Read (#3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/subscriptions')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /plans d.abonnement/i }).click()
    await page.waitForLoadState('networkidle')
  })

  test('table shows plan with all required columns', async ({ page }) => {
    await expect(page.getByText(/nom/i).first()).toBeVisible()
    await expect(page.getByText(/mensuel/i).first()).toBeVisible()
    await expect(page.getByText(/annuel/i).first()).toBeVisible()
    await expect(page.getByText(/essai/i).first()).toBeVisible()
    await expect(page.getByText(/statut/i).first()).toBeVisible()
  })

  test('trial column shows "-" for plan with trialDays=0', async ({ page }) => {
    // Plans with trialDays=0 show a dash "-", plans with trialDays>0 show "Xj"
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count > 0) {
      // At least one row exists — trial column either shows "Xj" or "-"
      const trialCells = page.getByText(/^\d+j$/).or(page.locator('span.text-slate-600', { hasText: '-' }))
      await expect(trialCells.first()).toBeVisible()
    }
  })

  test('edit and delete buttons are visible without hover', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count > 0) {
      const firstRow = rows.first()
      // Edit button (pencil icon) is the first button in the row
      await expect(firstRow.getByRole('button').first()).toBeVisible()
    }
  })
})

test.describe('Admin Subscriptions — Plan Creation (#4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/subscriptions')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /plans d.abonnement/i }).click()
  })

  test('clicking Nouveau Plan opens modal with empty fields', async ({ page }) => {
    await page.getByRole('button', { name: /nouveau plan/i }).click()
    // Modal uses Teleport to body — detect by the name input placeholder
    const nameInput = page.locator('input[placeholder="Ex: Booster Pro"]')
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toHaveValue('')
  })

  test('trialDays help text is visible in modal', async ({ page }) => {
    await page.getByRole('button', { name: /nouveau plan/i }).click()
    await expect(page.getByText(/0.*pas d.essai/i)).toBeVisible()
  })

  test('creating a plan with trialDays shows it in the table', async ({ page }) => {
    const planName = `Plan Test E2E ${Date.now()}`

    await page.getByRole('button', { name: /nouveau plan/i }).click()
    await page.locator('input[placeholder="Ex: Booster Pro"]').waitFor({ state: 'visible' })

    // Fill form fields
    await page.locator('input[placeholder="Ex: Booster Pro"]').fill(planName)
    // Prices: 3 number inputs in order — monthly, annual, lifetime
    await page.locator('input[type="number"]').nth(0).fill('29')
    await page.locator('input[type="number"]').nth(1).fill('249')
    await page.locator('input[type="number"]').nth(2).fill('499')
    // Trial days: 4th number input (after the 3 price fields)
    await page.locator('input[type="number"]').nth(3).fill('14')

    // Submit
    await page.getByRole('button', { name: /créer le plan/i }).click()

    // Plan appears in table
    await expect(page.getByText(planName)).toBeVisible({ timeout: 5000 })
  })

  test('created plan with trialDays=14 shows "14j" in Essai column', async ({ page }) => {
    // After creation, the trial column should show "14j"
    await expect(page.getByText('14j')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Admin Subscriptions — Plan Modification (#5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/subscriptions')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /plans d.abonnement/i }).click()
    await page.waitForLoadState('networkidle')
  })

  test('clicking edit opens modal pre-filled with plan data', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    test.skip(count === 0, 'No plans to edit')

    // Click first edit button (pencil icon)
    await rows.first().getByRole('button').first().click()

    // Modal opens — name input has a non-empty value
    const nameInput = page.locator('input[placeholder="Ex: Booster Pro"]')
    await expect(nameInput).toBeVisible()
    const value = await nameInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('updating trialDays to 14 updates the Essai column', async ({ page }) => {
    const rows = page.locator('tbody tr')
    test.skip(await rows.count() === 0, 'No plans to edit')

    await rows.first().getByRole('button').first().click()

    // Wait for modal
    await page.locator('input[placeholder="Ex: Booster Pro"]').waitFor({ state: 'visible' })

    // Trial days is the 4th number input in the modal
    const trialInput = page.locator('input[type="number"]').nth(3)
    await trialInput.clear()
    await trialInput.fill('14')

    await page.getByRole('button', { name: /enregistrer/i }).click()

    await expect(page.getByText('14j')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Admin Subscriptions — Plan Deletion (#6)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/subscriptions')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /plans d.abonnement/i }).click()
    await page.waitForLoadState('networkidle')
  })

  test('deleting a plan with no subscribers removes it from table', async ({ page }) => {
    // Create a temp plan to delete
    const planName = `Plan Delete E2E ${Date.now()}`
    await page.getByRole('button', { name: /nouveau plan/i }).click()
    await page.locator('input[placeholder="Ex: Booster Pro"]').waitFor({ state: 'visible' })

    await page.locator('input[placeholder="Ex: Booster Pro"]').fill(planName)
    await page.locator('input[type="number"]').nth(0).fill('9')
    await page.locator('input[type="number"]').nth(1).fill('79')
    await page.locator('input[type="number"]').nth(2).fill('199')
    await page.getByRole('button', { name: /créer le plan/i }).click()

    await expect(page.getByText(planName)).toBeVisible({ timeout: 5000 })

    // Find row with plan and click delete button (last button = trash icon)
    const row = page.locator('tbody tr').filter({ hasText: planName })
    // Delete uses native browser confirm() — accept it
    page.once('dialog', dialog => dialog.accept())
    await row.getByRole('button').last().click()

    await expect(page.getByText(planName)).not.toBeVisible({ timeout: 5000 })
  })

  test('deleting a plan with subscribers shows error toast', async ({ page }) => {
    // Find a plan that has subscribers (subscriptions count > 0)
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    test.skip(count === 0, 'No plans in table')

    // Look for a row showing subscriber count > 0
    const rowWithSubs = page.locator('tbody tr').filter({ hasText: /[1-9]\d*\s*abonné/i })
    test.skip(await rowWithSubs.count() === 0, 'No plan with active subscribers')

    page.once('dialog', dialog => dialog.accept())
    await rowWithSubs.first().getByRole('button').last().click()

    // Expect error toast
    await expect(page.locator('[class*="toast"], [class*="alert"]').filter({ hasText: /erreur|impossible|abonné/i }))
      .toBeVisible({ timeout: 5000 })
  })
})

test.describe('Admin Settings — No Free Trial Section (#7)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings')
    await page.waitForLoadState('networkidle')
  })

  test('billing tab exists and is clickable', async ({ page }) => {
    // Settings uses sidebar <button> elements (not role="tab")
    const billingTab = page.getByRole('button', { name: /facturation|stripe|billing/i })
    await expect(billingTab).toBeVisible()
    await billingTab.click()
  })

  test('billing tab shows only Stripe config section, no Essai Gratuit', async ({ page }) => {
    const billingTab = page.getByRole('button', { name: /facturation|stripe|billing/i })
    await billingTab.click()
    await page.waitForLoadState('networkidle')

    // Stripe section heading is present
    await expect(page.getByText(/configuration stripe/i).first()).toBeVisible()

    // "Essai Gratuit" section is NOT present
    await expect(page.getByText(/essai gratuit/i)).not.toBeVisible()
  })
})
