import type { ComponentType } from "react"
import type { ZodSchema } from "zod"

export type DocumentCategory =
  | "fiscal"
  | "tributario"
  | "previdenciario"
  | "outros"

export interface DocumentSummary {
  total_geral: number
  quantidade_debitos: number
  [key: string]: unknown
}

export interface ReviewFormProps<T = unknown> {
  relatorioId: string
  data: T
}

export interface DashboardProps<T = unknown> {
  relatorioId: string
  data: T
  history?: T[]
}

export interface ClientViewProps<T = unknown> {
  data: T
  empresa?: {
    cnpj: string
    razao_social: string | null
    nome_fantasia: string | null
  } | null
}

/**
 * Identificação do contribuinte extraída do JSON validado.
 * Permite que confirmReviewAction crie/encontre a empresa de forma
 * independente do schema de cada handler.
 */
export interface ContribuinteRef {
  cnpj: string | null
  razao_social: string | null
}

/**
 * Linha pronta para INSERT na tabela `debitos`. Cada handler pode optar
 * por seu próprio mapeamento; campos opcionais ficam null no banco.
 *
 * Histórico: o schema de `debitos` foi pensado pro RFB; reusamos a mesma
 * tabela para handlers municipais/estaduais usando convenção:
 *   - `tipo` carrega o ID do handler + categoria (ex: "natal:iss_simples_nacional")
 *   - `receita_codigo` recebe a "Origem" (CNPJ raiz / código TVS / etc)
 *   - `receita_descricao` recebe o `tipo_descricao`
 *   - `periodo_apuracao` recebe a "Referência"
 *   - `saldo_devedor` é sempre o que importa para totalização cross-handler
 */
export interface DebitoRowInput {
  tipo: string
  receita_codigo: string | null
  receita_descricao: string | null
  periodo_apuracao: string | null
  data_vencimento: string | null
  valor_original: number | null
  saldo_devedor: number | null
  multa: number | null
  juros: number | null
  saldo_consolidado: number | null
  situacao: string | null
}

export interface DocumentHandler<T = unknown> {
  id: string
  displayName: string
  category: DocumentCategory

  detect: (pdfText: string) => number

  schema: ZodSchema<T>
  extractionPrompt: string
  extractionSchema: object

  ReviewForm: ComponentType<ReviewFormProps<T>>
  Dashboard: ComponentType<DashboardProps<T>>
  /**
   * Visão simplificada para o cliente final (linguagem amigável, sem
   * jargão fiscal). Renderizada na rota pública /share/[token].
   */
  ClientView: ComponentType<ClientViewProps<T>>

  generateText: (data: T) => string
  computeSummary: (data: T) => DocumentSummary

  /**
   * Extrai a identificação do contribuinte (cnpj + razão social) do JSON
   * validado. Usado pelo confirmReviewAction para criar/encontrar a empresa.
   */
  extractContribuinte: (data: T) => ContribuinteRef

  /**
   * Mapeia o JSON validado em linhas para a tabela `debitos`. Pode devolver
   * array vazio se o tipo de documento não tem débitos individuais.
   *
   * Também devolve `data_emissao` (ISO YYYY-MM-DD) extraída dos metadados
   * do documento, para popular relatorios.data_emissao_documento.
   */
  extractDebitos: (data: T) => {
    data_emissao: string | null
    rows: DebitoRowInput[]
  }
}

/**
 * Storage type for the registry. Handlers concretos têm `T` em posições
 * invariantes (ReviewForm.data é covariante, mas o registry precisa aceitar
 * handlers de tipos heterogêneos). Usamos `any` aqui — consumidores reidratam
 * o tipo via `schema` ou cast explícito.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDocumentHandler = DocumentHandler<any>
