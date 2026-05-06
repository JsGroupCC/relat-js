import type { DocumentSummary } from "@/lib/documents/types"

import type { PendenciaIss, PendenciaTipo, PendenciasIssNatal } from "./schema"

export interface PendenciasIssNatalSummary extends DocumentSummary {
  total_geral: number
  total_iss_simples_nacional: number
  total_iss_homologado: number
  total_taxas: number // vigilância + licença
  total_iptu_tlp: number
  total_outros: number
  quantidade_debitos: number
  quantidade_iss: number
  quantidade_taxas: number
  vencido: number // total com data_vencimento no passado
  a_vencer: number // total com data_vencimento no futuro
}

export function computeSummary(
  data: PendenciasIssNatal,
): PendenciasIssNatalSummary {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let total_geral = 0
  let total_iss_simples_nacional = 0
  let total_iss_homologado = 0
  let total_taxas = 0
  let total_iptu_tlp = 0
  let total_outros = 0
  let vencido = 0
  let a_vencer = 0
  let quantidade_iss = 0
  let quantidade_taxas = 0

  for (const p of data.pendencias) {
    const saldo = computeSaldo(p)
    total_geral += saldo

    switch (p.tipo) {
      case "iss_simples_nacional":
        total_iss_simples_nacional += saldo
        quantidade_iss += 1
        break
      case "iss_homologado":
      case "iss_substituto":
        total_iss_homologado += saldo
        quantidade_iss += 1
        break
      case "taxa_vigilancia_sanitaria":
      case "taxa_licenca":
        total_taxas += saldo
        quantidade_taxas += 1
        break
      case "iptu":
      case "tlp":
        total_iptu_tlp += saldo
        break
      default:
        total_outros += saldo
    }

    const venc = new Date(p.data_vencimento)
    if (!Number.isNaN(venc.getTime())) {
      if (venc < today) {
        vencido += saldo
      } else {
        a_vencer += saldo
      }
    }
  }

  return {
    total_geral: round2(total_geral),
    total_iss_simples_nacional: round2(total_iss_simples_nacional),
    total_iss_homologado: round2(total_iss_homologado),
    total_taxas: round2(total_taxas),
    total_iptu_tlp: round2(total_iptu_tlp),
    total_outros: round2(total_outros),
    quantidade_debitos: data.pendencias.length,
    quantidade_iss,
    quantidade_taxas,
    vencido: round2(vencido),
    a_vencer: round2(a_vencer),
  }
}

export function computeSaldo(p: PendenciaIss): number {
  const apropriado = p.valor_apropriado ?? 0
  return Math.max(0, p.valor_original - apropriado)
}

export const TIPO_LABEL: Record<PendenciaTipo, string> = {
  iss_simples_nacional: "ISS Simples Nacional",
  iss_homologado: "ISS Homologado",
  iss_substituto: "ISS Substituto",
  taxa_vigilancia_sanitaria: "Taxa de Vigilância Sanitária",
  taxa_licenca: "Taxa de Licença",
  iptu: "IPTU",
  tlp: "Taxa de Limpeza Pública",
  parcelamento: "Parcelamento",
  outros: "Outros",
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
