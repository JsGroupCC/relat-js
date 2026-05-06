import { z } from "zod"

export const debitoSchema = z.object({
  receita_codigo: z.string(),
  receita_descricao: z.string(),
  periodo_apuracao: z.string(),
  data_vencimento: z.string(),
  valor_original: z.number(),
  saldo_devedor: z.number(),
  multa: z.number().nullable(),
  juros: z.number().nullable(),
  saldo_consolidado: z.number().nullable(),
  situacao: z.string(),
})
export type Debito = z.infer<typeof debitoSchema>

export const relatorioSituacaoFiscalSchema = z.object({
  empresa: z.object({
    cnpj: z.string(),
    razao_social: z.string(),
    responsavel: z
      .object({
        cpf: z.string(),
        nome: z.string(),
      })
      .nullable(),
    endereco: z.object({
      logradouro: z.string().nullable(),
      bairro: z.string().nullable(),
      cep: z.string().nullable(),
      municipio: z.string().nullable(),
      uf: z.string().nullable(),
    }),
    natureza_juridica: z.string().nullable(),
    cnae: z
      .object({
        codigo: z.string(),
        descricao: z.string(),
      })
      .nullable(),
    porte: z.string().nullable(),
    situacao: z.string(),
    data_abertura: z.string().nullable(),
    regime_tributario: z.object({
      simples_nacional: z.object({
        optante: z.boolean(),
        data_inclusao: z.string().nullable(),
        data_exclusao: z.string().nullable(),
      }),
      simei: z.object({
        optante: z.boolean(),
        data_inclusao: z.string().nullable(),
        data_exclusao: z.string().nullable(),
      }),
    }),
  }),
  pendencias_sief: z.array(debitoSchema),
  debitos_exigibilidade_suspensa: z.array(debitoSchema),
  pgfn: z.object({
    tem_pendencia: z.boolean(),
    debitos: z.array(debitoSchema),
  }),
  metadados_relatorio: z.object({
    data_emissao: z.string(),
    cpf_certificado: z.string().nullable(),
    paginas: z.number(),
  }),
})

export type RelatorioSituacaoFiscal = z.infer<typeof relatorioSituacaoFiscalSchema>
