import type { DebitoDetalhado } from "@/lib/empresas/debitos-detalhados"
import { formatCnpj } from "@/lib/utils/cnpj"

/**
 * CSV pt-BR (separador ;, decimal vírgula) com uma linha por débito —
 * útil pro contador conferir/conciliar no Excel ou puxar pra outras
 * planilhas.
 */
export function debitosToCsv(rows: DebitoDetalhado[]): string {
  const header = [
    "Razão social",
    "CNPJ",
    "Nome fantasia",
    "Fonte",
    "Handler",
    "Tipo",
    "Sub-tipo",
    "Código receita",
    "Descrição",
    "Período",
    "Vencimento",
    "Valor original",
    "Saldo devedor",
    "Multa",
    "Juros",
    "Saldo consolidado",
    "Situação",
    "Data emissão relatório",
    "Arquivo origem",
  ]

  const lines: string[] = [header.map(csvCell).join(";")]
  for (const r of rows) {
    const cells = [
      r.empresa_razao_social ?? "",
      formatCnpj(r.empresa_cnpj),
      r.empresa_nome_fantasia ?? "",
      r.fonte_label,
      r.handler_id,
      r.tipo,
      r.sub_tipo,
      r.receita_codigo ?? "",
      r.receita_descricao ?? "",
      r.periodo_apuracao ?? "",
      formatDate(r.data_vencimento),
      brl(r.valor_original),
      brl(r.saldo_devedor),
      brl(r.multa),
      brl(r.juros),
      brl(r.saldo_consolidado),
      r.situacao ?? "",
      formatDate(r.relatorio_data_emissao),
      r.relatorio_pdf,
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

function brl(n: number | null): string {
  if (n === null || n === undefined) return ""
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("pt-BR")
}
