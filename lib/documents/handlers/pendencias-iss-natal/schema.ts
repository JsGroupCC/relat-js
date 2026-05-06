import { z } from "zod"

/**
 * Tipos de pendência observados no documento SEFIN/Prefeitura de Natal:
 * - iss_simples_nacional: ISS devido a Natal informado no PGDAS (Simples Nacional)
 * - iss_homologado: ISS Próprio (NFS-e + DDS + DES-IF)
 * - iss_substituto: ISS retido na fonte (substituição tributária)
 * - taxa_vigilancia_sanitaria: TVS (origem numérica genérica)
 * - taxa_licenca: Taxa de Licença para Localização e Funcionamento
 * - iptu: Imposto Predial e Territorial Urbano
 * - tlp: Taxa de Limpeza Pública
 * - parcelamento: parcelas de parcelamentos ativos
 * - outros: fallback (mantém o tipo descritivo)
 */
export const pendenciaTipoEnum = z.enum([
  "iss_simples_nacional",
  "iss_homologado",
  "iss_substituto",
  "taxa_vigilancia_sanitaria",
  "taxa_licenca",
  "iptu",
  "tlp",
  "parcelamento",
  "outros",
])
export type PendenciaTipo = z.infer<typeof pendenciaTipoEnum>

export const pendenciaIssSchema = z.object({
  origem: z.string(), // CNPJ, CPF ou identificador numérico (TVS)
  tipo: pendenciaTipoEnum,
  tipo_descricao: z.string(), // texto original do PDF (ex: "ISS Simples Nacional")
  referencia: z.string(), // "06/2021", "2025", número Parcelamento — formato livre
  parcela: z.number().int().nullable(),
  data_vencimento: z.string(), // ISO YYYY-MM-DD
  valor_original: z.number(),
  valor_apropriado: z.number().nullable(), // valor pago/abatido
  saldo_devedor: z.number(), // calculado: valor_original - valor_apropriado
})
export type PendenciaIss = z.infer<typeof pendenciaIssSchema>

export const pendenciasIssNatalSchema = z.object({
  contribuinte: z.object({
    cnpj: z.string(), // CNPJ ou CPF
    razao_social: z.string(),
    data_posicao: z.string(), // ISO datetime
  }),
  pendencias: z.array(pendenciaIssSchema),
  metadados_relatorio: z.object({
    data_emissao: z.string(), // ISO YYYY-MM-DD
    municipio: z.string(), // "Natal/RN"
    paginas: z.number(),
  }),
})

export type PendenciasIssNatal = z.infer<typeof pendenciasIssNatalSchema>
