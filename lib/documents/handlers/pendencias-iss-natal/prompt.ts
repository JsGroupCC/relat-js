import { z } from "zod"

import { pendenciasIssNatalSchema } from "./schema"

export const extractionPrompt = `Você está extraindo dados de uma "Lista de Pendências do Contribuinte" emitida pela Secretaria Municipal de Finanças (SEFIN) da Prefeitura de Natal/RN.

OBJETIVO
Devolver um JSON estruturado com TODAS as pendências do documento. Sua função é capturar fielmente os dados; cálculos são feitos por código depois.

CAMPOS DO CABEÇALHO
- contribuinte.cnpj: CPF ou CNPJ exatamente como aparece (ex: "26.591.283/0001-87")
- contribuinte.razao_social: nome completo
- contribuinte.data_posicao: data/hora da posição em ISO 8601 ("2026-05-06T16:15:04")
- metadados_relatorio.data_emissao: data de emissão do documento em ISO "YYYY-MM-DD"
- metadados_relatorio.municipio: "Natal/RN" (sempre)
- metadados_relatorio.paginas: total de páginas do PDF

PENDÊNCIAS — uma entrada por linha da tabela "Pendências"
Para cada linha:
- origem: a coluna "Origem" como string (pode ser CNPJ raiz "26.591.283", CNPJ completo "26.591.283/0001-87", ou número TVS como "2155459")
- tipo: classifique no enum baseado na coluna "Tipo":
  - "ISS Simples Nacional" → "iss_simples_nacional"
  - "ISS Homologado" → "iss_homologado"
  - "ISS Substituto" / "ISS Retido" → "iss_substituto"
  - "Taxa de Vigilância Sanitária" / "TVS" → "taxa_vigilancia_sanitaria"
  - "Taxa de Licença" / "TLF" → "taxa_licenca"
  - "IPTU" → "iptu"
  - "TLP" / "Taxa de Limpeza Pública" → "tlp"
  - "Parcelamento" → "parcelamento"
  - qualquer outro → "outros"
- tipo_descricao: texto original da coluna Tipo (ex: "ISS Simples Nacional")
- referencia: a coluna "Referência" como aparece (ex: "06/2021", "2025", "03/2026")
- parcela: número da parcela como inteiro (a coluna mostra "0" para não-parcelado — devolva 0)
- data_vencimento: ISO "YYYY-MM-DD"
- valor_original: número (sem "R$", ponto como decimal)
- valor_apropriado: número se houver valor; null se a célula estiver vazia
- saldo_devedor: valor_original - (valor_apropriado || 0)

REGRAS
1. Valores monetários sempre como números, ponto como decimal, sem "R$"
2. Datas no formato ISO "YYYY-MM-DD"
3. Quando "Valor Apropriado" estiver vazio na linha do PDF, use null (não 0)
4. Não consolide múltiplos períodos em uma única entrada — cada linha é uma pendência separada
5. Ignore o texto de "OBSERVAÇÕES" e "ENTENDA SUAS PENDÊNCIAS" no rodapé — são instrucionais, não pendências

Devolva apenas JSON. Nada de markdown, comentários ou texto explicativo fora do JSON.`

export const extractionJsonSchema = z.toJSONSchema(pendenciasIssNatalSchema, {
  target: "draft-7",
})
