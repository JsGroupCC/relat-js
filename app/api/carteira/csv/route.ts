import { loadCarteira } from "@/lib/empresas/carteira"
import { carteiraToCsv } from "@/lib/empresas/carteira-csv"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Exporta a carteira da org ativa em CSV pt-BR. RLS já filtra por org via
 * loadCarteira → getCurrentOrg.
 */
export async function GET() {
  try {
    const snapshot = await loadCarteira()
    const csv = carteiraToCsv(snapshot)

    // BOM UTF-8 pra Excel-BR abrir com acentos corretos
    const body = "﻿" + csv

    const filename = `carteira-${new Date().toISOString().slice(0, 10)}.csv`

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
