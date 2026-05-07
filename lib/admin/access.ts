import "server-only"

import { createClient } from "@/lib/supabase/server"

/**
 * /admin é restrito a uma allowlist de emails configurada via env
 * `ADMIN_EMAILS` (separados por vírgula). Sem env, ninguém passa — fail-safe.
 *
 * O check usa supabase.auth.getUser() (que valida o JWT no server) — não dá
 * pra spoofar via header.
 */
export async function isAdminUser(): Promise<{
  ok: boolean
  email: string | null
}> {
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  if (allowlist.length === 0) {
    return { ok: false, email: null }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase() ?? null

  return { ok: !!email && allowlist.includes(email), email: user?.email ?? null }
}
