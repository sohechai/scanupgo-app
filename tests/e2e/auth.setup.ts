import { test as setup } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, '.auth/admin.json')

/**
 * Auth setup: logs in as SUPER_ADMIN once and saves session state.
 * All other tests reuse this session.
 */
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/admin/login')

  await page.locator('#email').fill(process.env.ADMIN_EMAIL || 'admin@boosteravis.com')
  await page.locator('#password').fill(process.env.ADMIN_PASSWORD || 'Test1234!')
  await page.locator('button[type="submit"]').click()

  // Wait for redirect to admin dashboard
  await page.waitForURL('**/admin**', { timeout: 15000 })

  await page.context().storageState({ path: authFile })
})
