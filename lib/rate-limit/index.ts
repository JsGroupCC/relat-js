import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Rate limit por organização para operações que disparam LLM.
 *
 * Conta `relatorios.created_at` na janela móvel — não exige tabela auxiliar
 * porque toda extração começa por um upload, e o upload já cria a linha em
 * `relatorios`. O custo da query é baixo: index em (organization_id, created_at).
 *
 * Default conservador: 30/h e 200/dia. Ajustável por env (RATE_LIMIT_HOURLY,
 * RATE_LIMIT_DAILY) — útil pra subir/baixar sem deploy de código.
 */

const DEFAULT_HOURLY = 30
const DEFAULT_DAILY = 200

export interface RateLimitDecision {
  ok: boolean
  /** quantas operações na janela horária */
  hourlyCount: number
  hourlyLimit: number
  dailyCount: number
  dailyLimit: number
  /** mensagem amigável quando ok=false */
  message?: string
}

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export async function checkExtractRateLimit(
  organizationId: string,
): Promise<RateLimitDecision> {
  const hourlyLimit = readPositiveInt("RATE_LIMIT_HOURLY", DEFAULT_HOURLY)
  const dailyLimit = readPositiveInt("RATE_LIMIT_DAILY", DEFAULT_DAILY)

  const supabase = createAdminClient()
  const now = Date.now()
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()

  const [hourly, daily] = await Promise.all([
    supabase
      .from("relatorios")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", oneHourAgo),
    supabase
      .from("relatorios")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", oneDayAgo),
  ])

  const hourlyCount = hourly.count ?? 0
  const dailyCount = daily.count ?? 0

  if (hourlyCount >= hourlyLimit) {
    return {
      ok: false,
      hourlyCount,
      hourlyLimit,
      dailyCount,
      dailyLimit,
      message: `Limite por hora atingido (${hourlyCount}/${hourlyLimit}). Tente novamente em alguns minutos.`,
    }
  }
  if (dailyCount >= dailyLimit) {
    return {
      ok: false,
      hourlyCount,
      hourlyLimit,
      dailyCount,
      dailyLimit,
      message: `Limite diário atingido (${dailyCount}/${dailyLimit}). O contador zera após 24h.`,
    }
  }

  return { ok: true, hourlyCount, hourlyLimit, dailyCount, dailyLimit }
}
