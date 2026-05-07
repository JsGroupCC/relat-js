import { debitosToCsv } from "@/lib/empresas/debitos-csv"
import { loadDebitosDetalhados } from "@/lib/empresas/debitos-detalhados"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Exporta TODOS os débitos da org em CSV detalhado (uma linha por débito,
 * com identificação da empresa e do relatório de origem).
 */
export async function GET() {
  try {
    const rows = await loadDebitosDetalhados()
    const csv = debitosToCsv(rows)
    const body = "﻿" + csv // BOM UTF-8

    const filename = `debitos-${new Date().toISOString().slice(0, 10)}.csv`

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido"
    return new Response(`Falha ao gerar CSV: ${message}`, { status: 500 })
  }
}
