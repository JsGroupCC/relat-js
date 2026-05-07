import { test as setup, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import path from "node:path"
import fs from "node:fs"

/**
 * Garante que existe um usuário de teste e uma organização vinculada,
 * faz login pela UI e salva o storage state pra outros testes reusarem.
 *
 * Cria via admin client (service role) com email_confirm=true pra evitar a
 * etapa de confirmação de email. Idempotente: se o usuário já existe, só
 * loga; se já tem org, reusa.
 */
const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL ?? "e2e@relat-js.test"
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? "playwright-test-pwd-1!"
const E2E_ORG_NAME = process.env.E2E_ORG_NAME ?? "E2E Org"

const STORAGE_PATH = path.join(__dirname, ".auth", "user.json")

setup("authenticate", async ({ page }) => {
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true })

  await ensureUserAndOrg()

  await page.goto("/login")
  await page.getByLabel(/e-?mail/i).fill(E2E_USER_EMAIL)
  await page.getByLabel(/senha/i).fill(E2E_USER_PASSWORD)
  await page.getByRole("button", { name: /entrar/i }).click()

  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

  await page.context().storageState({ path: STORAGE_PATH })
})

async function ensureUserAndOrg() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      "E2E setup requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local",
    )
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Cria ou reusa o user (email_confirm=true pula confirmação)
  let userId: string | null = null
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const existing = list.data.users.find((u) => u.email === E2E_USER_EMAIL)
  if (existing) {
    userId = existing.id
    await admin.auth.admin.updateUserById(userId, {
      password: E2E_USER_PASSWORD,
    })
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: E2E_USER_EMAIL,
      password: E2E_USER_PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) {
      throw new Error(`Falha ao criar user E2E: ${error?.message}`)
    }
    userId = data.user.id
  }

  // Garante que existe ao menos uma org com esse user como owner
  const { data: memberships } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
  if (memberships && memberships.length > 0) return

  const slug = `e2e-${userId.slice(0, 8)}`
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: E2E_ORG_NAME, slug })
    .select("id")
    .single()
  if (orgError || !org) {
    throw new Error(`Falha ao criar org E2E: ${orgError?.message}`)
  }
  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ organization_id: org.id, user_id: userId, role: "owner" })
  if (memberError) {
    throw new Error(`Falha ao linkar membership E2E: ${memberError.message}`)
  }
}
