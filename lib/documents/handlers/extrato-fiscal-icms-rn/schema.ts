import { z } from "zod"

/**
 * Tipos de obrigação acessória observados no Extrato Fiscal UVT/SEFAZ-RN.
 * - das_nao_pago: ICMS no DAS não pago (Simples Nacional)
 * - divergencia_das: diferença entre valor pago e apurado no DAS
 * - arquivo_efd_nao_informado: EFD Perfil "C" não informada
 * - outros: fallback
 */
export const obrigacaoAcessoriaTipoEnum = z.enum([
  "das_nao_pago",
  "divergencia_das",
  "arquivo_efd_nao_informado",
  "outros",
])
export type ObrigacaoAcessoriaTipo = z.infer<typeof obrigacaoAcessoriaTipoEnum>

export const obrigacaoAcessoriaSchema = z.object({
  tipo: obrigacaoAcessoriaTipoEnum,
  descricao: z.string(),
  referencia: z.string(), // "202302" (AAAAMM)
  valor_pago: z.number().nullable(),
  valor_apurado: z.number().nullable(),
  valor_diferenca: z.number().nullable(),
  valor_total: z.number().nullable(), // usado quando é só "valor único"
})
export type ObrigacaoAcessoria = z.infer<typeof obrigacaoAcessoriaSchema>

/**
 * Origem do débito principal: NFe, EFD ou RFB.
 */
export const debitoOrigemTipoEnum = z.enum(["nfe", "efd", "rfb", "outros"])
export type DebitoOrigemTipo = z.infer<typeof debitoOrigemTipoEnum>

export const debitoIcmsSchema = z.object({
  data_vencimento: z.string(), // ISO YYYY-MM-DD
  origem_tipo: debitoOrigemTipoEnum,
  origem_descricao: z.string(), // "NFE-66704-1", "Débitos Efd - 202602", "RFB - 26591283..."
  documento: z.string().nullable(),
  chave_tadf: z.string().nullable(),
  valor: z.number(),
  icms: z.number().nullable(),
  cobranca: z.boolean().nullable(), // SIM=true, NAO=false
  cnpj_emitente_destinatario: z.string().nullable(),
  razao_social: z.string().nullable(),
  uf: z.string().nullable(),
  tipo_nota: z.enum(["E", "S"]).nullable(), // entrada/saída
})
export type DebitoIcms = z.infer<typeof debitoIcmsSchema>

export const cobrancaBancariaSchema = z.object({
  data_vencimento: z.string(),
  origem_descricao: z.string(), // "EFD"
  valor_nominal: z.number(),
})
export type CobrancaBancaria = z.infer<typeof cobrancaBancariaSchema>

export const credenciamentoSchema = z.object({
  tipo: z.string(), // "Credenciamento para ICMS antecipado"
  data_inicial: z.string(),
  data_final: z.string().nullable(),
})
export type Credenciamento = z.infer<typeof credenciamentoSchema>

export const ocorrenciaFiscalSchema = z.object({
  descricao: z.string(),
  data_inicial: z.string(),
  data_final: z.string().nullable(),
})
export type OcorrenciaFiscal = z.infer<typeof ocorrenciaFiscalSchema>

export const regimeEspecialSchema = z.object({
  descricao: z.string(),
  data_inicial: z.string(),
  observacao: z.string().nullable(),
})
export type RegimeEspecial = z.infer<typeof regimeEspecialSchema>

export const extratoFiscalIcmsRnSchema = z.object({
  empresa: z.object({
    cnpj: z.string(),
    razao_social: z.string(),
    inscricao_estadual: z.string().nullable(),
    cnae_primario: z
      .object({ codigo: z.string(), descricao: z.string() })
      .nullable(),
    cnae_secundario: z
      .object({ codigo: z.string(), descricao: z.string() })
      .nullable(),
    regime_pagamento: z.string().nullable(),
    tipo_contribuinte: z.string().nullable(),
    inicio_atividade: z.string().nullable(), // ISO YYYY-MM-DD
    endereco: z
      .object({
        logradouro: z.string().nullable(),
        bairro: z.string().nullable(),
        cep: z.string().nullable(),
        municipio: z.string().nullable(),
        uf: z.string().nullable(),
      })
      .nullable(),
  }),
  situacao: z.object({
    cadastral: z.string(), // "ATIVO" / "INATIVO"
    fiscal: z.string(), // "CRITICADO" / "REGULAR" etc
    credenciamento_icms_antecipado: z.string().nullable(),
    limite_credito: z.number().nullable(),
    observacoes: z.string().nullable(),
  }),
  obrigacoes_acessorias: z.array(obrigacaoAcessoriaSchema),
  debitos_vencidos: z.array(debitoIcmsSchema),
  debitos_a_vencer: z.array(debitoIcmsSchema),
  cobranca_bancaria: z.array(cobrancaBancariaSchema),
  credenciamentos: z.array(credenciamentoSchema),
  ocorrencias_fiscais: z.array(ocorrenciaFiscalSchema),
  regime_especial: z.array(regimeEspecialSchema),
  totais: z.object({
    total_debitos_vencidos: z.number(),
    total_debitos_a_vencer: z.number(),
    total_cobranca_bancaria: z.number(),
  }),
  metadados_relatorio: z.object({
    data_emissao: z.string(), // ISO datetime
    uf: z.string(), // "RN"
    paginas: z.number(),
  }),
})

export type ExtratoFiscalIcmsRn = z.infer<typeof extratoFiscalIcmsRnSchema>
