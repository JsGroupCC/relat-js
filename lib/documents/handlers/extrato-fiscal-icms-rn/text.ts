import { computeSummary, OBRIGACAO_LABEL, ORIGEM_LABEL } from "./compute"
import type { ExtratoFiscalIcmsRn } from "./schema"

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})
const DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

function brl(n: number): string {
  return BRL.format(n)
}
function fmtDate(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return DATE.format(d)
}

export function generateText(data: ExtratoFiscalIcmsRn): string {
  const s = computeSummary(data)
  const e = data.empresa
  const lines: string[] = []

  lines.push(`Análise Fiscal Estadual (ICMS) — ${e.razao_social} (CNPJ ${e.cnpj})`)
  if (e.inscricao_estadual) {
    lines.push(`Inscrição Estadual: ${e.inscricao_estadual}`)
  }
  lines.push(`Estado: ${data.metadados_relatorio.uf}`)
  lines.push(`Posição em ${fmtDate(data.metadados_relatorio.data_emissao)}.`)
  lines.push("")

  lines.push("Situação cadastral e fiscal:")
  lines.push(`• Cadastral: ${data.situacao.cadastral}`)
  lines.push(`• Fiscal: ${data.situacao.fiscal}${s.esta_criticado ? " ⚠" : ""}`)
  if (data.situacao.credenciamento_icms_antecipado) {
    lines.push(
      `• Credenciamento ICMS Antecipado: ${data.situacao.credenciamento_icms_antecipado}`,
    )
  }
  if (data.situacao.limite_credito != null) {
    lines.push(`• Limite de crédito: ${brl(data.situacao.limite_credito)}`)
  }
  lines.push("")

  lines.push("Resumo financeiro:")
  lines.push(
    `• Débitos vencidos (principal): ${brl(s.total_debitos_vencidos)} em ${s.quantidade_vencidos} lançamento(s).`,
  )
  if (s.total_icms_vencidos > 0) {
    lines.push(`  - ICMS vencido: ${brl(s.total_icms_vencidos)}`)
  }
  if (s.quantidade_a_vencer > 0) {
    lines.push(
      `• Débitos a vencer: ${brl(s.total_debitos_a_vencer)} em ${s.quantidade_a_vencer} lançamento(s).`,
    )
  }
  if (s.quantidade_obrigacoes_acessorias > 0) {
    lines.push(
      `• Obrigações acessórias pendentes: ${s.quantidade_obrigacoes_acessorias} item(s) (DAS, divergências, EFD).`,
    )
    if (s.total_obrigacoes_acessorias > 0) {
      lines.push(
        `  - Total monetário das obrigações acessórias: ${brl(s.total_obrigacoes_acessorias)}`,
      )
    }
  }
  if (s.total_cobranca_bancaria > 0) {
    lines.push(
      `• Já em cobrança bancária: ${brl(s.total_cobranca_bancaria)}.`,
    )
  }
  lines.push(`• Total devido (principal + acessórios): ${brl(s.total_geral)}.`)
  lines.push("")

  if (data.obrigacoes_acessorias.length > 0) {
    lines.push("Obrigações acessórias pendentes:")
    for (const o of data.obrigacoes_acessorias) {
      const label = OBRIGACAO_LABEL[o.tipo]
      const valor =
        o.valor_diferenca != null
          ? brl(o.valor_diferenca)
          : o.valor_total != null
            ? brl(o.valor_total)
            : "—"
      lines.push(`  - ${label} | ref. ${o.referencia} | ${valor}`)
    }
    lines.push("")
  }

  if (data.debitos_vencidos.length > 0) {
    lines.push("Débitos vencidos (top 10 por valor):")
    const top = [...data.debitos_vencidos]
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10)
    for (const d of top) {
      lines.push(
        `  - ${ORIGEM_LABEL[d.origem_tipo]} ${d.origem_descricao} | venc. ${fmtDate(d.data_vencimento)} | ${brl(d.valor)}` +
          (d.icms ? ` (ICMS ${brl(d.icms)})` : ""),
      )
    }
    if (data.debitos_vencidos.length > 10) {
      lines.push(
        `  + ${data.debitos_vencidos.length - 10} outro(s) débito(s) vencido(s).`,
      )
    }
    lines.push("")
  }

  if (data.regime_especial.length > 0) {
    lines.push("Regimes especiais ativos:")
    for (const r of data.regime_especial) {
      lines.push(
        `  - ${r.descricao} | desde ${fmtDate(r.data_inicial)}` +
          (r.observacao ? ` | ${r.observacao}` : ""),
      )
    }
    lines.push("")
  }

  if (s.esta_criticado) {
    lines.push(
      "⚠ Atenção: a empresa está com situação fiscal CRITICADA. Isso bloqueia credenciamento para ICMS antecipado e pode impactar emissão de NFe. Recomendamos regularizar as pendências o quanto antes.",
    )
  }
  lines.push(
    "Recomendação: avaliar parcelamento estadual ou pagamento à vista. Para débitos em cobrança bancária, contactar diretamente a SEFAZ-RN para negociar.",
  )

  return lines.join("\n")
}
