/**
 * RLS isolation tests
 * ================================================================
 * Verifica que a RLS impede que uma org enxergue dados de outra.
 *
 * Pré-requisitos:
 *   - .env.local configurado com:
 *       NEXT_PUBLIC_SUPABASE_URL
 *       NEXT_PUBLIC_SUPABASE_ANON_KEY
 *       SUPABASE_SERVICE_ROLE_KEY  (a real, com role=service_role)
 *   - Migrations aplicadas no projeto Supabase apontado.
 *
 * Como rodar:
 *   npm test                    # executa uma vez
 *   npm run test:watch          # modo watch
 *
 * Os testes criam usuários e orgs de teste com sufixo aleatório,
 * exercitam acesso cruzado e fazem cleanup automático no afterAll.
 *
 * ⚠️ Usa a service_role key — só rode contra projetos onde dados de
 * teste sejam descartáveis. NUNCA contra produção.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { config as loadEnv } from "dotenv"

loadEnv({ path: ".env.local" })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

const skipReason =
  !SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SERVICE
    ? "RLS tests require NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    : null

// Wrap em describe.skipIf — Vitest pula a suite inteira se faltar env.
describe.skipIf(skipReason !== null)("RLS isolation between organizations", () => {
  // Tipos auxiliares
  interface UserContext {
    userId: string
    email: string
    orgId: string
    client: SupabaseClient
  }

  let admin: SupabaseClient
  let alice: UserContext
  let bob: UserContext

  const suffix = Math.random().toString(36).slice(2, 8)
  const aliceEmail = `rls-alice-${suffix}@test.local`
  const bobEmail = `rls-bob-${suffix}@test.local`
  const password = "test-password-1234"

  // Resources criados pelos testes — limpos no afterAll.
  const cleanup = {
    userIds: [] as string[],
    orgIds: [] as string[],
    empresaIds: [] as string[],
  }

  async function createUserAndSignIn(email: string): Promise<{
    userId: string
    client: SupabaseClient
  }> {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error || !created.user) throw error ?? new Error("createUser failed")
    cleanup.userIds.push(created.user.id)

    const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) throw signInError
    return { userId: created.user.id, client: userClient }
  }

  async function createOrgFor(ctx: { userId: string; client: SupabaseClient }, name: string) {
    const slug = `rls-${name.toLowerCase()}-${suffix}`
    // RLS de organizations.insert exige auth.uid() != null — feito como o user.
    const { data: org, error: orgError } = await ctx.client
      .from("organizations")
      .insert({ name: `RLS ${name} ${suffix}`, slug })
      .select("id")
      .single()
    if (orgError || !org) throw orgError ?? new Error("org insert failed")
    cleanup.orgIds.push(org.id)

    // Self-membership (special case na policy: primeiro owner da org)
    const { error: memberError } = await ctx.client
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: ctx.userId, role: "owner" })
    if (memberError) throw memberError
    return org.id as string
  }

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const aliceUser = await createUserAndSignIn(aliceEmail)
    const aliceOrgId = await createOrgFor(aliceUser, "alice")
    alice = { ...aliceUser, email: aliceEmail, orgId: aliceOrgId }

    const bobUser = await createUserAndSignIn(bobEmail)
    const bobOrgId = await createOrgFor(bobUser, "bob")
    bob = { ...bobUser, email: bobEmail, orgId: bobOrgId }
  })

  afterAll(async () => {
    // Best-effort: tabelas com cascade em organizations.
    if (admin) {
      for (const orgId of cleanup.orgIds) {
        await admin.from("organizations").delete().eq("id", orgId)
      }
      for (const userId of cleanup.userIds) {
        await admin.auth.admin.deleteUser(userId)
      }
    }
  })

  it("alice sees her own org and only her own", async () => {
    const { data, error } = await alice.client.from("organizations").select("id, slug")
    expect(error).toBeNull()
    const ids = (data ?? []).map((o) => o.id)
    expect(ids).toContain(alice.orgId)
    expect(ids).not.toContain(bob.orgId)
  })

  it("alice cannot read bob's empresas", async () => {
    // Bob cria empresa
    const cnpj = `0000000${Math.floor(Math.random() * 9000000) + 1000000}`.slice(-14)
    const { data: bobEmpresa, error: insertError } = await bob.client
      .from("empresas")
      .insert({
        organization_id: bob.orgId,
        cnpj,
        razao_social: "Empresa Bob LTDA",
      })
      .select("id")
      .single()
    expect(insertError).toBeNull()
    expect(bobEmpresa?.id).toBeTruthy()
    if (bobEmpresa) cleanup.empresaIds.push(bobEmpresa.id)

    // Alice tenta ler — deve devolver lista vazia (RLS filtra, não 403).
    const { data: aliceSees, error: aliceErr } = await alice.client
      .from("empresas")
      .select("id, organization_id, razao_social")
      .eq("id", bobEmpresa!.id)
    expect(aliceErr).toBeNull()
    expect(aliceSees).toEqual([])
  })

  it("alice cannot insert empresa into bob's org", async () => {
    const cnpj = `0000000${Math.floor(Math.random() * 9000000) + 1000000}`.slice(-14)
    const { error } = await alice.client.from("empresas").insert({
      organization_id: bob.orgId, // <-- intencionalmente errado
      cnpj,
      razao_social: "Tentativa de invasão",
    })
    // RLS rejeita o INSERT por with_check
    expect(error).not.toBeNull()
  })

  it("alice cannot read bob's relatorios", async () => {
    // Bob cria um relatório vazio para testar leitura cruzada
    const { data: rel, error: relErr } = await bob.client
      .from("relatorios")
      .insert({
        organization_id: bob.orgId,
        document_type: "relatorio-situacao-fiscal",
        pdf_path: "test/none",
        pdf_filename: "test.pdf",
        status: "pending",
      })
      .select("id")
      .single()
    expect(relErr).toBeNull()
    expect(rel?.id).toBeTruthy()

    const { data: aliceSees } = await alice.client
      .from("relatorios")
      .select("id")
      .eq("id", rel!.id)
    expect(aliceSees).toEqual([])
  })

  it("alice's helper is_org_member returns false for bob's org", async () => {
    const { data, error } = await alice.client.rpc(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "is_org_member" as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { org_id: bob.orgId } as any,
    )
    expect(error).toBeNull()
    expect(data).toBe(false)
  })

  it("list_organization_members refuses cross-org call", async () => {
    const { error } = await alice.client.rpc(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "list_organization_members" as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { org_id: bob.orgId } as any,
    )
    // A função levanta exceção 'forbidden' — Postgres devolve erro.
    expect(error).not.toBeNull()
  })
})
