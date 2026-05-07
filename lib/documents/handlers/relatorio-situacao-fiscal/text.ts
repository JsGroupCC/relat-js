import { computeSummary } from "./compute"
import type { RelatorioSituacaoFiscal } from "./schema"

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

function formatBRL(n: number): string {
  return BRL.format(n)
}

function formatISODate(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateFormatter.format(date)
}

/**
 * Gera o texto explicativo pronto para entregar ao cliente.
 * Determinístico (não chama LLM) e baseado nos valores já validados.
 */
export function generateText(data: RelatorioSituacaoFiscal): string {
  const s = computeSummary(data)
  const empresa = data.empresa
  const meta = data.metadados_relatorio

  const lines: string[] = []

  lines.push(
    `Análise do Relatório de Situação Fiscal — ${empresa.razao_social} (CNPJ ${empresa.cnpj})`,
  )
  lines.push(`Emitido em ${formatISODate(meta.data_emissao)}.`)
  lines.push("")

  lines.push("Resumo financeiro:")
  lines.push(
    `• Pendências SIEF (Receita Federal): ${formatBRL(s.total_pendencias_sief)} em ${s.quantidade_sief} débito(s).`,
  )
  lines.push(
    `• Débitos com exigibilidade suspensa: ${formatBRL(s.total_exigibilidade_suspensa)} em ${s.quantidade_suspensa} débito(s).`,
  )
  lines.push(
    `• Inscrições em dívida ativa (PGFN): ${formatBRL(s.total_pgfn)} em ${s.quantidade_pgfn} débito(s).`,
  )
  lines.push(`• Total devido (SIEF + PGFN): ${formatBRL(s.total_geral)}.`)
  lines.push("")

  lines.push("Situação para emissão de certidão:")
  lines.push(
    s.pode_emitir_cnd
      ? "✓ A empresa pode emitir CND (Certidão Negativa de Débitos)."
      : "✗ A empresa NÃO pode emitir CND no momento — há pendências SIEF ou PGFN em aberto.",
  )
  lines.push(
    s.pode_emitir_cpd_en
      ? "✓ A empresa pode emitir CPD-EN (Certidão Positiva com Efeito de Negativa)."
      : "✗ A empresa NÃO pode emitir CPD-EN no momento.",
  )
  lines.push("")

  if (s.quantidade_debitos > 0) {
    lines.push("Detalhamento por categoria:")
    if (data.pendencias_sief.length > 0) {
      lines.push("")
      lines.push("Pendências SIEF:")
      for (const d of data.pendencias_sief) {
        lines.push(
          `  - ${d.receita_codigo ?? "—"} ${d.receita_descricao ?? ""} | apuração ${d.periodo_apuracao ?? "—"} | venc. ${formatISODate(d.data_vencimento)} | saldo ${formatBRL(d.saldo_consolidado ?? d.saldo_devedor ?? 0)} | ${d.situacao ?? ""}`,
        )
      }
    }
    if (data.debitos_exigibilidade_suspensa.length > 0) {
      lines.push("")
      lines.push("Exigibilidade suspensa:")
      for (const d of data.debitos_exigibilidade_suspensa) {
        lines.push(
          `  - ${d.receita_codigo ?? "—"} ${d.receita_descricao ?? ""} | apuração ${d.periodo_apuracao ?? "—"} | saldo ${formatBRL(d.saldo_devedor ?? 0)} | ${d.situacao ?? ""}`,
        )
      }
    }
    if (data.pgfn.debitos.length > 0) {
      lines.push("")
      lines.push("PGFN (dívida ativa):")
      for (const d of data.pgfn.debitos) {
        lines.push(
          `  - ${d.receita_codigo ?? "—"} ${d.receita_descricao ?? ""} | apuração ${d.periodo_apuracao ?? "—"} | saldo ${formatBRL(d.saldo_devedor ?? 0)} | ${d.situacao ?? ""}`,
        )
      }
    }
    lines.push("")
  }

  if (
    empresa.regime_tributario.simples_nacional.optante ||
    empresa.regime_tributario.simei.optante
  ) {
    lines.push("Regime tributário:")
    if (empresa.regime_tributario.simples_nacional.optante) {
      lines.push(
        `• Optante pelo Simples Nacional desde ${formatISODate(empresa.regime_tributario.simples_nacional.data_inclusao)}.`,
      )
    }
    if (empresa.regime_tributario.simei.optante) {
      lines.push(
        `• Optante pelo SIMEI desde ${formatISODate(empresa.regime_tributario.simei.data_inclusao)}.`,
      )
    }
    lines.push("")
  }

  lines.push(
    "Recomendação: revise os valores antes de finalizar e, em caso de divergência com seu controle interno, confronte com o PDF original do relatório.",
  )

  return lines.join("\n")
}
