/**
 * Heurística rápida (regex/keyword) para identificar um Relatório de Situação
 * Fiscal antes de chamar a LLM. Retorna 0..1.
 *
 * Os marcadores foram tirados do cabeçalho típico do documento emitido pelo
 * e-CAC. Se o texto bate em vários, a confidence sobe.
 */
const MARKERS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /relat[óo]rio\s+de\s+situa[çc][ãa]o\s+fiscal/i, weight: 0.5 },
  { pattern: /diagn[óo]stico\s+fiscal/i, weight: 0.15 },
  { pattern: /pend[êe]ncias?\s*-?\s*sief/i, weight: 0.15 },
  { pattern: /procuradoria-?geral\s+da\s+fazenda\s+nacional|pgfn/i, weight: 0.1 },
  { pattern: /exigibilidade\s+suspensa/i, weight: 0.05 },
  { pattern: /receita\s+federal/i, weight: 0.05 },
]

export function detect(pdfText: string): number {
  if (!pdfText) return 0
  const sample = pdfText.slice(0, 4000)
  let score = 0
  for (const { pattern, weight } of MARKERS) {
    if (pattern.test(sample)) score += weight
  }
  return Math.min(1, score)
}
