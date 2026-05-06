/**
 * CNPJ utilities — strip, format, validate (DV).
 * Refs: ER do Banco Central; algoritmo módulo-11 com pesos.
 */

export function stripCnpj(value: string): string {
  return value.replace(/\D/g, "")
}

export function formatCnpj(value: string): string {
  const d = stripCnpj(value).padStart(14, "0").slice(-14)
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

const WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

function calcCheck(digits: number[], weights: number[]): number {
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0)
  const mod = sum % 11
  return mod < 2 ? 0 : 11 - mod
}

/**
 * Validação completa do CNPJ. Aceita string com ou sem máscara.
 * Rejeita valores triviais (todos os dígitos iguais).
 */
export function isValidCnpj(value: string): boolean {
  const cnpj = stripCnpj(value)
  if (cnpj.length !== 14) return false
  if (/^(\d)\1+$/.test(cnpj)) return false

  const digits = cnpj.split("").map(Number)
  const dv1 = calcCheck(digits.slice(0, 12), WEIGHTS_1)
  if (dv1 !== digits[12]) return false
  const dv2 = calcCheck(digits.slice(0, 13), WEIGHTS_2)
  return dv2 === digits[13]
}
