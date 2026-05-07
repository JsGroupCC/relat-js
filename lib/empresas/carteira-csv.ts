import { FONTE_LABEL, type CarteiraSnapshot } from "@/lib/empresas/carteira"
import { formatCnpj } from "@/lib/utils/cnpj"

/**
 * Serializa a carteira em CSV pt-BR (vírgula como separador decimal,
 * ponto-e-vírgula como separador de campo — ainda é o padrão pra Excel-BR).
 */
export function carteiraToCsv(snapshot: CarteiraSnapshot): string {
  const fontes = Object.keys(FONTE_LABEL) as Array<keyof typeof FONTE_LABEL>

  const header = [
    "Razão social",
    "CNPJ",
    "Nome fantasia",
    ...fontes.map((f) => `Total ${FONTE_LABEL[f]}`),
    "Total geral",
    "Qtd débitos",
    "Última atualização",
  ]

  const lines: string[] = [header.map(csvCell).join(";")]

  for (const r of snapshot.rows) {
    const cells = [
      r.razao_social ?? "",
      formatCnpj(r.cnpj),
      r.nome_fantasia ?? "",
      ...fontes.map((f) => formatBr(r.por_fonte[f])),
      formatBr(r.total_geral),
      String(r.qtd_debitos),
      r.ultimo_relatorio_at
        ? new Date(r.ultimo_relatorio_at).toLocaleDateString("pt-BR")
        : "",
    ]
    lines.push(cells.map(csvCell).join(";"))
  }

  return lines.join("\r\n")
}

function csvCell(raw: string): string {
  if (raw === "") return ""
  if (/[";\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

function formatBr(n: number): string {
  if (!n) return "0,00"
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
