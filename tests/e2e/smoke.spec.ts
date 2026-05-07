import { test, expect } from "@playwright/test"

/**
 * Smoke: navegação básica autenticada. Se este quebrar, app inteira tá morta.
 */

test("dashboard carrega após login (storageState)", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})

test("sidebar tem links principais", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page.getByRole("link", { name: /upload/i }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: /relat[óo]rios/i }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: /empresas/i }).first()).toBeVisible()
})

test("pode acessar configurações e atividade", async ({ page }) => {
  await page.goto("/configuracoes")
  await expect(page.getByRole("heading", { name: /configura/i })).toBeVisible()

  await page.getByRole("link", { name: /atividade/i }).click()
  await expect(page).toHaveURL(/\/configuracoes\/atividade/)
  await expect(page.getByRole("heading", { name: /atividade/i })).toBeVisible()
})
