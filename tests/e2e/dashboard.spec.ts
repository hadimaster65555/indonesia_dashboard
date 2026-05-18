import { expect, test } from '@playwright/test'

test('daily brief renders primary dashboard regions', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'National Signals and Required Attention' })).toBeVisible()
  await expect(page.getByText('Command Alerts')).toBeVisible()
  await expect(page.getByText('Regional Intervention Map')).toBeVisible()
})

test('source health page exposes ingestion status table', async ({ page }) => {
  await page.goto('/source-health')
  await expect(page.getByRole('heading', { name: 'Ingestion Runs and Freshness SLA' })).toBeVisible()
  await expect(page.getByText('BMKG Weather and Earthquake API')).toBeVisible()
  await expect(page.getByText('Bank Indonesia JISDOR')).toBeVisible()
})
