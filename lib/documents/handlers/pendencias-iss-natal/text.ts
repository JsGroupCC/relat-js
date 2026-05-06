import { computeSaldo, computeSummary, TIPO_LABEL } from "./compute"
import type { PendenciasIssNatal } from "./schema"

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

function formatDate(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return DATE.format(d)
}

export function generateText(data: PendenciasIssNatal): string {
  const s = computeSummary(data)
  const c = data.contribuinte
  const lines: string[] = []

  lines.push(
    `Análise de Pendências Municipais — ${c.razao_social} (${c.cnpj})`,
  )
  lines.push(`Município: ${data.metadados_relatorio.municipio}`)
  lines.push(`Posição em ${formatDate(data.metadados_relatorio.data_emissao)}.`)
  lines.push("")

  lines.push("Resumo financeiro:")
  if (s.total_iss_simples_nacional > 0) {
    lines.push(`• ISS Simples Nacional: ${brl(s.total_iss_simples_nacional)}.`)
  }
  if (s.total_iss_homologado > 0) {
    lines.push(`• ISS Homologado/Substituto: ${brl(s.total_iss_homologado)}.`)
  }
  if (s.total_taxas > 0) {
    lines.push(`• Taxas (Vigilância/Licença): ${brl(s.total_taxas)}.`)
  }
  if (s.total_iptu_tlp > 0) {
    lines.push(`• IPTU + TLP: ${brl(s.total_iptu_tlp)}.`)
  }
  if (s.total_outros > 0) {
    lines.push(`• Outros: ${brl(s.total_outros)}.`)
  }
  lines.push(`• Total devido: ${brl(s.total_geral)} em ${s.quantidade_debitos} pendência(s).`)
  if (s.vencido > 0) {
    lines.push(
      `• Já vencido: ${brl(s.vencido)} (sujeito a juros e multa adicionais).`,
    )
  }
  if (s.a_vencer > 0) {
    lines.push(`• A vencer: ${brl(s.a_vencer)}.`)
  }
  lines.push("")

  if (data.pendencias.length > 0) {
    lines.push("Detalhe das pendências:")
    const grouped = groupBy(data.pendencias, (p) => p.tipo_descricao)
    for (const [grupo, items] of grouped) {
      lines.push("")
      lines.push(`${grupo}:`)
      for (const p of items) {
        const saldo = computeSaldo(p)
        const ref = p.parcela && p.parcela > 0 ? `${p.referencia} parcela ${p.parcela}` : p.referencia
        lines.push(
          `  - ${ref} | venc. ${formatDate(p.data_vencimento)} | original ${brl(p.valor_original)}` +
            (p.valor_apropriado ? ` | pago ${brl(p.valor_apropriado)}` : "") +
            ` | saldo ${brl(saldo)}`,
        )
      }
    }
    lines.push("")
  }

  lines.push(
    "Recomendação: o município de Natal aceita pagamento via DAM (Documento de Arrecadação Municipal) na rede bancária ou casas lotéricas. Considere parcelamentos especiais quando disponíveis. ISS Homologado quitado via DAM não amortiza ISS Simples Nacional — verifique cada lançamento separadamente.",
  )

  return lines.join("\n")
}

function groupBy<T, K>(arr: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of arr) {
    const k = key(item)
    const list = map.get(k) ?? []
    list.push(item)
    map.set(k, list)
  }
  return map
}

export { TIPO_LABEL }
