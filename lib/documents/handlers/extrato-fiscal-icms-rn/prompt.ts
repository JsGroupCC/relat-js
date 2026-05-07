import { z } from "zod"

import { extratoFiscalIcmsRnSchema } from "./schema"

export const extractionPrompt = `Você está extraindo dados de um "Extrato Fiscal do Contribuinte" emitido pela Unidade Virtual de Tributação (UVT) da Secretaria da Fazenda do Rio Grande do Norte (SEFAZ-RN).

OBJETIVO
Devolver um JSON estruturado com TODOS os dados do documento. Sua função é capturar fielmente; cálculos são feitos por código depois.

EMPRESA (cabeçalho — seção "Dados Gerais")
- empresa.cnpj: como aparece (com pontuação)
- empresa.razao_social: nome completo
- empresa.inscricao_estadual: como aparece (ex: "20.461.260-8")
- empresa.cnae_primario / cnae_secundario: {codigo, descricao} ou null
- empresa.regime_pagamento: "NORMAL" | "SIMPLES NACIONAL" | etc
- empresa.tipo_contribuinte: "NORMAL" | etc
- empresa.inicio_atividade: ISO "YYYY-MM-DD"
- empresa.endereco: parse do logradouro completo

SITUAÇÃO (seção "Situação")
- situacao.cadastral: "ATIVO" | "INATIVO" | "BAIXADO" etc
- situacao.fiscal: "CRITICADO" | "REGULAR" | etc
- situacao.credenciamento_icms_antecipado: status (ex: "INIBIDO PELA SIT. FISCAL") ou null
- situacao.limite_credito: número (ex: 30000.00) ou null
- situacao.observacoes: texto adicional ou null

OBRIGAÇÕES ACESSÓRIAS (seção "Pendências de Obrigações Acessórias")
Para cada linha, classifique no enum de tipos:
- "DAS NAO PAGO" → tipo "das_nao_pago"; valor_total = valor único informado
- "DAS - DIFERENÇA DE VALOR PAGO X APURADO" → tipo "divergencia_das"; capture valor_pago, valor_apurado, valor_diferenca = apurado - pago
- "ARQUIVO EFD PERFIL 'C' - NÃO INFORMADO" → tipo "arquivo_efd_nao_informado"; valor_total = null
- Outros → tipo "outros"
- referencia: AAAAMM como string (ex: "202302")

DÉBITOS VENCIDOS (seção "DÉBITOS VENCIDOS")
Cada linha vira uma entrada em debitos_vencidos:
- data_vencimento: ISO "YYYY-MM-DD" (a data agrupadora à esquerda da seção)
- origem_tipo: classifique a "Origem Débito":
  - "NFE-..." → "nfe"
  - "Débitos Efd - ..." → "efd"
  - "RFB - ..." → "rfb"
  - outros → "outros"
- origem_descricao: texto original da coluna "Origem Débito"
- documento: número do documento (ex: "66704") ou null
- chave_tadf: chave de NFe quando disponível (44 dígitos) ou null
- valor: número (coluna "Valor (R$)")
- icms: número (coluna "ICMS (R$)") ou null
- cobranca: true se "SIM", false se "NAO", null se vazio
- cnpj_emitente_destinatario: como aparece ou null
- razao_social: como aparece ou null
- uf: sigla 2 letras ou null
- tipo_nota: "E" para entrada, "S" para saída, ou null

DÉBITOS A VENCER (seção "DÉBITOS A VENCER"): mesma estrutura.

COBRANÇA BANCÁRIA (seção "DÉBITOS ENVIADOS PARA COBRANÇA BANCÁRIA")
Para cada linha:
- data_vencimento, origem_descricao (geralmente "EFD"), valor_nominal

INFORMAÇÕES COMPLEMENTARES
- credenciamentos: array com {tipo, data_inicial ISO, data_final ISO ou null}
- ocorrencias_fiscais: array com {descricao, data_inicial ISO, data_final ISO ou null}
- regime_especial: array com {descricao, data_inicial ISO, observacao}

TOTAIS (rodapé das seções)
- total_debitos_vencidos: o "Total Geral Débitos Vencidos"
- total_debitos_a_vencer: o "Total Geral dos DÉBITOS A VENCER"
- total_cobranca_bancaria: o "Total Geral Cobrança Bancária"

METADADOS
- data_emissao: timestamp do canto superior do PDF em ISO 8601
- uf: "RN" sempre
- paginas: total

REGRAS
1. Valores monetários como números (sem "R$"), ponto como decimal
2. Datas ISO "YYYY-MM-DD"; timestamps ISO 8601 quando aplicável
3. Campos opcionais ausentes = null (não invente)
4. Não consolide múltiplas linhas em uma só
5. Ignore textos puramente decorativos do PDF

Devolva apenas JSON, sem markdown.`

export const extractionJsonSchema = z.toJSONSchema(extratoFiscalIcmsRnSchema, {
  target: "draft-7",
})
