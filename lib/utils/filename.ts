/**
 * Sanitiza um nome de arquivo: remove path separators, caracteres exóticos e
 * limita o tamanho. Mantém somente [a-zA-Z0-9._-].
 */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "arquivo.pdf"
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
  const trimmed = cleaned.length > 120 ? cleaned.slice(0, 120) : cleaned
  return trimmed.length > 0 ? trimmed : "arquivo.pdf"
}
