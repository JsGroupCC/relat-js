"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Trash2Icon } from "lucide-react"
import { useState, useTransition } from "react"
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
} from "react-hook-form"
import { toast } from "sonner"

import { confirmReviewAction } from "@/lib/relatorios/actions"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { computeSummary, OBRIGACAO_LABEL, ORIGEM_LABEL } from "./compute"
import {
  extratoFiscalIcmsRnSchema,
  type ExtratoFiscalIcmsRn,
} from "./schema"

interface Props {
  relatorioId: string
  data: ExtratoFiscalIcmsRn
}

export function ReviewForm({ relatorioId, data }: Props) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<ExtratoFiscalIcmsRn>({
    resolver: zodResolver(extratoFiscalIcmsRnSchema),
    defaultValues: data,
    mode: "onBlur",
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const control = form.control as Control<any>

  const debitosVencidos = useFieldArray({
    control: form.control,
    name: "debitos_vencidos",
  })
  const debitosAVencer = useFieldArray({
    control: form.control,
    name: "debitos_a_vencer",
  })
  const obrigacoes = useFieldArray({
    control: form.control,
    name: "obrigacoes_acessorias",
  })

  const watched = useWatch({ control: form.control }) as
    | ExtratoFiscalIcmsRn
    | undefined
  const summary = (() => {
    if (!watched) return null
    try {
      return computeSummary(watched)
    } catch {
      return null
    }
  })()

  const onSubmit = (values: ExtratoFiscalIcmsRn) => {
    startTransition(async () => {
      try {
        await confirmReviewAction({ relatorioId, verifiedData: values })
      } catch (err) {
        if (err instanceof Error && /NEXT_REDIRECT/.test(err.message)) {
          throw err
        }
        toast.error(err instanceof Error ? err.message : "Erro ao confirmar.")
      }
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
        noValidate
      >
        {summary && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-4 text-sm md:grid-cols-4">
            <Stat label="Total devido" value={brl(summary.total_geral)} />
            <Stat
              label="Débitos vencidos"
              value={brl(summary.total_debitos_vencidos)}
              tone={summary.quantidade_vencidos > 0 ? "warning" : undefined}
            />
            <Stat
              label="A vencer"
              value={brl(summary.total_debitos_a_vencer)}
            />
            <Stat
              label="Cobrança bancária"
              value={brl(summary.total_cobranca_bancaria)}
              tone={summary.total_cobranca_bancaria > 0 ? "warning" : undefined}
            />
          </div>
        )}

        <Section title="Empresa">
          <Grid2>
            <SimpleField control={control} name="empresa.cnpj" label="CNPJ" />
            <SimpleField
              control={control}
              name="empresa.razao_social"
              label="Razão social"
            />
            <SimpleField
              control={control}
              name="empresa.inscricao_estadual"
              label="Inscrição Estadual"
            />
            <SimpleField
              control={control}
              name="empresa.regime_pagamento"
              label="Regime de pagamento"
            />
          </Grid2>
        </Section>

        <Section title="Situação">
          <Grid2>
            <SimpleField
              control={control}
              name="situacao.cadastral"
              label="Situação cadastral"
              placeholder="ATIVO"
            />
            <SimpleField
              control={control}
              name="situacao.fiscal"
              label="Situação fiscal"
              placeholder="CRITICADO"
            />
            <SimpleField
              control={control}
              name="situacao.credenciamento_icms_antecipado"
              label="Credenciamento ICMS antecipado"
            />
            <NumberField
              control={control}
              name="situacao.limite_credito"
              label="Limite de crédito"
              nullable
            />
          </Grid2>
        </Section>

        <Section
          title={`Obrigações acessórias (${obrigacoes.fields.length})`}
        >
          {obrigacoes.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma obrigação acessória pendente.
            </p>
          )}
          <div className="space-y-2">
            {obrigacoes.fields.map((row, idx) => (
              <ObrigacaoRow
                key={row.id}
                control={control}
                base={`obrigacoes_acessorias.${idx}`}
                onRemove={() => obrigacoes.remove(idx)}
              />
            ))}
          </div>
        </Section>

        <Section
          title={`Débitos vencidos (${debitosVencidos.fields.length})`}
        >
          {debitosVencidos.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum débito vencido.
            </p>
          )}
          <div className="space-y-2">
            {debitosVencidos.fields.map((row, idx) => (
              <DebitoRow
                key={row.id}
                control={control}
                base={`debitos_vencidos.${idx}`}
                onRemove={() => debitosVencidos.remove(idx)}
              />
            ))}
          </div>
        </Section>

        {debitosAVencer.fields.length > 0 && (
          <Section title={`Débitos a vencer (${debitosAVencer.fields.length})`}>
            <div className="space-y-2">
              {debitosAVencer.fields.map((row, idx) => (
                <DebitoRow
                  key={row.id}
                  control={control}
                  base={`debitos_a_vencer.${idx}`}
                  onRemove={() => debitosAVencer.remove(idx)}
                />
              ))}
            </div>
          </Section>
        )}

        <Section title="Totais (declarados pelo documento)">
          <Grid2>
            <NumberField
              control={control}
              name="totais.total_debitos_vencidos"
              label="Total débitos vencidos"
            />
            <NumberField
              control={control}
              name="totais.total_debitos_a_vencer"
              label="Total a vencer"
            />
            <NumberField
              control={control}
              name="totais.total_cobranca_bancaria"
              label="Total cobrança bancária"
            />
            <SimpleField
              control={control}
              name="metadados_relatorio.data_emissao"
              label="Data de emissão"
              placeholder="2026-05-06T16:14:00"
            />
          </Grid2>
        </Section>

        <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t bg-background/95 px-1 py-3 backdrop-blur">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirmar revisão
          </Button>
        </div>
      </form>
    </Form>
  )
}

function ObrigacaoRow({
  control,
  base,
  onRemove,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  base: string
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const tipo = useWatch({ control, name: `${base}.tipo` }) as
    | keyof typeof OBRIGACAO_LABEL
    | undefined
  const referencia = useWatch({ control, name: `${base}.referencia` }) as string
  const diff = useWatch({
    control,
    name: `${base}.valor_diferenca`,
  }) as number | null
  const total = useWatch({
    control,
    name: `${base}.valor_total`,
  }) as number | null

  const value = diff ?? total ?? 0

  return (
    <div className="rounded-lg border bg-background">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/40"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
          <span className="truncate font-medium">
            {tipo ? OBRIGACAO_LABEL[tipo] : "—"}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs">{referencia || "—"}</span>
          <span className="ml-auto pr-2 text-xs font-medium">{brl(value)}</span>
        </div>
      </button>
      {open && (
        <div className="space-y-3 border-t p-3">
          <Grid2>
            <SimpleField control={control} name={`${base}.descricao`} label="Descrição" />
            <SimpleField control={control} name={`${base}.referencia`} label="Referência" />
            <NumberField control={control} name={`${base}.valor_pago`} label="Valor pago" nullable />
            <NumberField
              control={control}
              name={`${base}.valor_apurado`}
              label="Valor apurado"
              nullable
            />
            <NumberField
              control={control}
              name={`${base}.valor_diferenca`}
              label="Diferença"
              nullable
            />
            <NumberField
              control={control}
              name={`${base}.valor_total`}
              label="Valor total"
              nullable
            />
          </Grid2>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onRemove()
                setOpen(false)
              }}
            >
              <Trash2Icon className="mr-1 size-4" />
              Remover
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function DebitoRow({
  control,
  base,
  onRemove,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  base: string
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const origemTipo = useWatch({ control, name: `${base}.origem_tipo` }) as
    | keyof typeof ORIGEM_LABEL
    | undefined
  const origemDescricao = useWatch({
    control,
    name: `${base}.origem_descricao`,
  }) as string
  const valor = useWatch({ control, name: `${base}.valor` }) as number
  const dataVenc = useWatch({
    control,
    name: `${base}.data_vencimento`,
  }) as string

  return (
    <div className="rounded-lg border bg-background">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/40"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
          <span className="text-xs text-muted-foreground">
            {origemTipo ? ORIGEM_LABEL[origemTipo] : "—"}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="truncate text-xs">{origemDescricao}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs">{dataVenc}</span>
          <span className="ml-auto pr-2 text-xs font-medium">
            {typeof valor === "number" ? brl(valor) : "—"}
          </span>
        </div>
      </button>
      {open && (
        <div className="space-y-3 border-t p-3">
          <Grid2>
            <SimpleField
              control={control}
              name={`${base}.data_vencimento`}
              label="Vencimento"
              placeholder="YYYY-MM-DD"
            />
            <SimpleField
              control={control}
              name={`${base}.origem_descricao`}
              label="Origem do débito"
            />
            <SimpleField control={control} name={`${base}.documento`} label="Documento" />
            <NumberField control={control} name={`${base}.valor`} label="Valor" />
            <NumberField
              control={control}
              name={`${base}.icms`}
              label="ICMS"
              nullable
            />
            <SimpleField
              control={control}
              name={`${base}.cnpj_emitente_destinatario`}
              label="CNPJ Emitente/Destinatário"
            />
            <SimpleField
              control={control}
              name={`${base}.razao_social`}
              label="Razão Social"
            />
            <SimpleField control={control} name={`${base}.uf`} label="UF" />
          </Grid2>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onRemove()
                setOpen(false)
              }}
            >
              <Trash2Icon className="mr-1 size-4" />
              Remover
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
}
function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "warning"
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-base font-semibold ${tone === "warning" ? "text-amber-600" : ""}`}
      >
        {value}
      </div>
    </div>
  )
}
function SimpleField(props: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  name: string
  label: string
  placeholder?: string
}) {
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              placeholder={props.placeholder}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
function NumberField(props: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  name: string
  label: string
  nullable?: boolean
}) {
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <FormControl>
            <div className="flex items-center gap-2">
              <Input
                inputMode="decimal"
                value={
                  field.value === null || field.value === undefined
                    ? ""
                    : String(field.value)
                }
                onChange={(e) => {
                  const raw = e.target.value.replace(",", ".").trim()
                  if (raw === "") {
                    field.onChange(props.nullable ? null : 0)
                    return
                  }
                  const n = Number(raw)
                  if (Number.isNaN(n)) return
                  field.onChange(n)
                }}
                onBlur={field.onBlur}
              />
              <Label className="text-xs text-muted-foreground">R$</Label>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
function brl(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n)
}
