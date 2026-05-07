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

/**
 * Mapeia handler ID → fonte fiscal. Centralizado aqui pra evitar 3-4 cópias
 * espalhadas por carteira/vencimentos/debitos-detalhados/page-de-relatorios.
 *
 * Ao adicionar handler novo, adicione aqui também.
 */
export const HANDLER_TO_FONTE: Record<string, FonteFiscal> = {
  "relatorio-situacao-fiscal": "federal",
  "extrato-fiscal-icms-rn": "estadual",
  "pendencias-iss-natal": "municipal",
}

export function fonteFromHandlerId(handlerId: string): FonteFiscal {
  return HANDLER_TO_FONTE[handlerId] ?? "outros"
}

/**
 * Inversa: pra cada fonte, quais handlers pertencem. Usado pelo
 * /relatorios?fonte= pra resolver alias → document_types da query.
 */
export function handlersByFonte(fonte: FonteFiscal): string[] {
  return Object.entries(HANDLER_TO_FONTE)
    .filter(([, f]) => f === fonte)
    .map(([id]) => id)
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
