import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

/**
 * Cria, valida listagem e edita uma empresa via UI.
 *
 * Cleanup: ao final apaga a empresa diretamente via service role,
 * evitando lixo no banco entre runs.
 */

const TEST_RAZAO = `E2E Empresa ${Date.now()}`

// CNPJ válido com DV correto. Gerado uma vez e usado em todos os tests pra
// dar pra fazer cleanup. Se o test rodar em paralelo precisa virar dinâmico.
const TEST_CNPJ_DIGITS = "27865757000102" // CNPJ formalmente válido

let createdEmpresaId: string | null = null

test.afterAll(async () => {
  if (!createdEmpresaId) return
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  await admin.from("empresas").delete().eq("id", createdEmpresaId)
})

test.describe.serial("CRUD de empresas", () => {
  test("cria empresa pelo formulário", async ({ page }) => {
    await page.goto("/empresas")

    await page.locator("#cnpj").fill(TEST_CNPJ_DIGITS)
    await page.locator("#razao_social").fill(TEST_RAZAO)
    await page.getByRole("button", { name: /criar empresa/i }).click()

    await page.waitForURL(/\/empresas\/\d+/, { timeout: 10_000 })
    await expect(page.getByText(TEST_RAZAO).first()).toBeVisible()

    // Pega o ID via service role pra cleanup
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data } = await admin
      .from("empresas")
      .select("id")
      .eq("cnpj", TEST_CNPJ_DIGITS)
      .limit(1)
      .maybeSingle()
    createdEmpresaId = data?.id ?? null
    expect(createdEmpresaId).not.toBeNull()
  })

  test("listagem mostra a empresa criada", async ({ page }) => {
    await page.goto("/empresas")
    await expect(page.getByText(TEST_RAZAO).first()).toBeVisible()
  })

  test("edita razão social pela dialog", async ({ page }) => {
    await page.goto(`/empresas/${TEST_CNPJ_DIGITS}`)

    await page.getByRole("button", { name: /editar/i }).first().click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    const novoRazao = `${TEST_RAZAO} editada`
    const razaoInput = dialog.locator("#razao-edit")
    await razaoInput.fill(novoRazao)
    await dialog.getByRole("button", { name: /salvar/i }).click()

    await page.waitForLoadState("networkidle")
    await expect(page.getByText(novoRazao).first()).toBeVisible()
  })
})
