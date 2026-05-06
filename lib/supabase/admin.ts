import "server-only"

import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

/**
 * Cliente com service_role. CONTORNA RLS. Use apenas em código server-side
 * confiável (jobs, webhooks, ações administrativas). Nunca importe deste módulo
 * em código que possa rodar no client.
 *
 * O import "server-only" garante erro de build se este arquivo for puxado em
 * um Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "createAdminClient: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.",
    )
  }

  assertIsServiceRoleKey(key)

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Detecta antes do boot se a chave colada em SUPABASE_SERVICE_ROLE_KEY é
 * realmente uma service_role e não, por engano, a anon/publishable (erro
 * comum: o Supabase Dashboard mostra ambas lado a lado).
 *
 * Não loga o conteúdo da chave em nenhuma branch — apenas formato detectado.
 */
function assertIsServiceRoleKey(key: string): void {
  // Novo formato: sb_secret_... (service) vs sb_publishable_... (anon)
  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY parece ser a publishable key (sb_publishable_...). " +
        "Pegue a 'secret API key' (sb_secret_...) ou o 'service_role secret' (JWT) " +
        "em Supabase Dashboard → Project Settings → API.",
    )
  }
  if (key.startsWith("sb_secret_")) {
    return // formato novo válido
  }

  // Formato JWT legado: precisa ter role=service_role no payload.
  if (key.startsWith("eyJ")) {
    const role = readJwtRole(key)
    if (role === "anon") {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY parece ser a anon key (JWT com role=anon). " +
          "Use o 'service_role secret' (Reveal) em Supabase Dashboard → Project Settings → API.",
      )
    }
    if (role && role !== "service_role") {
      throw new Error(
        `SUPABASE_SERVICE_ROLE_KEY tem role inesperado: ${role}. Esperado: service_role.`,
      )
    }
    // Se não conseguiu ler o payload, segue em frente — o Supabase API
    // rejeita com 401 e o erro fica claro lá.
    return
  }

  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY com formato desconhecido. Esperado: 'sb_secret_...' ou JWT começando com 'eyJ'.",
  )
}

function readJwtRole(jwt: string): string | null {
  try {
    const parts = jwt.split(".")
    if (parts.length !== 3) return null
    // base64url → base64
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4)
    const json = Buffer.from(padded, "base64").toString("utf8")
    const payload = JSON.parse(json) as { role?: unknown }
    return typeof payload.role === "string" ? payload.role : null
  } catch {
    return null
  }
}
