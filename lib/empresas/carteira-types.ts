/**
 * Tipos e constantes compartilhados da carteira. Sem `server-only` —
 * pode ser importado por componentes client (CarteiraTable, CarteiraChart).
 *
 * A função de carregar (loadCarteira) vive em ./carteira.ts e é restrita
 * ao server.
 */

export type FonteFiscal = "federal" | "estadual" | "municipal" | "outros"

export const FONTE_LABEL: Record<FonteFiscal, string> = {
  federal: "Federal",
  estadual: "Estadual",
  municipal: "Municipal",
  outros: "Outros",
}

export interface CarteiraRow {
  empresa_id: string
  cnpj: string
  razao_social: string | null
  nome_fantasia: string | null
  por_fonte: Record<FonteFiscal, number>
  total_geral: number
  qtd_debitos: number
  ultimo_relatorio_at: string | null
}

export interface CarteiraSnapshot {
  rows: CarteiraRow[]
  total_geral: number
  total_por_fonte: Record<FonteFiscal, number>
  qtd_empresas_com_debito: number
}
