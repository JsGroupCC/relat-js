import { z } from "zod"

import { relatorioSituacaoFiscalSchema } from "./schema"

export const extractionPrompt = `Você está extraindo dados de um Relatório de Situação Fiscal emitido pela Receita Federal do Brasil em conjunto com a PGFN.

OBJETIVO
Devolver um JSON estruturado com TODOS os campos do schema. Preencha exatamente o que está no documento — não invente, não some, não calcule. Cálculos são feitos por código depois; sua função é fielmente capturar valores brutos.

REGRAS DE EXTRAÇÃO
1. Valores monetários: números (não strings). Use ponto como separador decimal. Não inclua "R$".
2. Datas isoladas (vencimento, abertura, emissão): formato ISO "YYYY-MM-DD".
3. Períodos de apuração: mantenha o formato original do PDF (ex: "03/2025", "2024", "12/2023").
4. CNPJ e CPF: mantenha exatamente como aparecem (com pontuação se houver).
5. Quando um campo não existir no documento, use null. Não invente "N/A" nem "—".
6. Booleanos para Simples Nacional / SIMEI: true se há indicação clara de opção; false caso contrário.
7. Cada débito (SIEF, exigibilidade suspensa, PGFN) é um item separado no array correspondente. Não consolide múltiplos períodos em um único item.
8. Se uma seção não existir no documento, devolva array vazio (não null).
9. "metadados_relatorio.paginas": total de páginas do PDF.

CATEGORIZAÇÃO DOS DÉBITOS
- pendencias_sief: débitos que constam como pendentes no Sistema de Informações da SRF (geralmente bloqueiam a emissão de CND).
- debitos_exigibilidade_suspensa: débitos com exigibilidade suspensa (parcelados, com decisão judicial, etc.). Não bloqueiam CND, mas bloqueiam CPD-EN.
- pgfn.debitos: débitos inscritos em Dívida Ativa da União, conforme o relatório PGFN.

Devolva apenas JSON. Nada de markdown, comentários ou texto explicativo fora do JSON.`

export const extractionJsonSchema = z.toJSONSchema(
  relatorioSituacaoFiscalSchema,
  {
    target: "draft-7",
  },
)
