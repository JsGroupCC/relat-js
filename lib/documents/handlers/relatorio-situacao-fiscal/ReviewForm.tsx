"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, PlusIcon, Trash2Icon } from "lucide-react"
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

import { computeSummary } from "./compute"
import {
  relatorioSituacaoFiscalSchema,
  type Debito,
  type RelatorioSituacaoFiscal,
} from "./schema"

interface Props {
  relatorioId: string
  data: RelatorioSituacaoFiscal
}

const emptyDebito: Debito = {
  receita_codigo: "",
  receita_descricao: "",
  periodo_apuracao: "",
  data_vencimento: "",
  valor_original: 0,
  saldo_devedor: 0,
  multa: null,
  juros: null,
  saldo_consolidado: null,
  situacao: "",
}

export function ReviewForm({ relatorioId, data }: Props) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<RelatorioSituacaoFiscal>({
    resolver: zodResolver(relatorioSituacaoFiscalSchema),
    defaultValues: data,
    mode: "onBlur",
  })

  // Cast pra `any` para passar a control aos helpers genéricos. Necessário
  // pela contravariância de Control<T> em RHF v7+ (`validate: ValidateForm<T>`).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const control = form.control as Control<any>

  const sief = useFieldArray({ control: form.control, name: "pendencias_sief" })
  const suspensos = useFieldArray({
    control: form.control,
    name: "debitos_exigibilidade_suspensa",
  })
  const pgfn = useFieldArray({ control: form.control, name: "pgfn.debitos" })

  const watched = useWatch({ control: form.control }) as RelatorioSituacaoFiscal | undefined
  const summary = (() => {
    if (!watched) return null
    try {
      return computeSummary(watched)
    } catch {
      return null
    }
  })()

  const onSubmit = (values: RelatorioSituacaoFiscal) => {
    startTransition(async () => {
      try {
        await confirmReviewAction({ relatorioId, verifiedData: values })
      } catch (err) {
        // redirect() em Server Action lança NEXT_REDIRECT que sobe pelo catch.
        // É comportamento normal do Next, não erro real — re-throw para o
        // runtime do Next processar a navegação.
        if (err instanceof Error && /NEXT_REDIRECT/.test(err.message)) {
          throw err
        }
        const msg = err instanceof Error ? err.message : "Erro ao confirmar."
        toast.error(msg)
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
            <SummaryStat label="Total devido (CND)" value={brl(summary.total_geral)} />
            <SummaryStat label="SIEF" value={brl(summary.total_pendencias_sief)} />
            <SummaryStat label="PGFN" value={brl(summary.total_pgfn)} />
            <SummaryStat
              label="Pode emitir CND"
              value={summary.pode_emitir_cnd ? "Sim" : "Não"}
              tone={summary.pode_emitir_cnd ? "positive" : "warning"}
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
            <SimpleField control={control} name="empresa.situacao" label="Situação" />
            <SimpleField
              control={control}
              name="empresa.data_abertura"
              label="Data de abertura"
              placeholder="YYYY-MM-DD"
            />
          </Grid2>
        </Section>

        <Section title="Endereço">
          <Grid2>
            <SimpleField
              control={control}
              name="empresa.endereco.logradouro"
              label="Logradouro"
            />
            <SimpleField
              control={control}
              name="empresa.endereco.bairro"
              label="Bairro"
            />
            <SimpleField
              control={control}
              name="empresa.endereco.cep"
              label="CEP"
            />
            <SimpleField
              control={control}
              name="empresa.endereco.municipio"
              label="Município"
            />
            <SimpleField control={control} name="empresa.endereco.uf" label="UF" />
          </Grid2>
        </Section>

        <DebitosSection
          title="Pendências SIEF"
          control={control}
          fieldName="pendencias_sief"
          fields={sief.fields}
          onAdd={() => sief.append(emptyDebito)}
          onRemove={(idx) => sief.remove(idx)}
        />

        <DebitosSection
          title="Débitos com exigibilidade suspensa"
          control={control}
          fieldName="debitos_exigibilidade_suspensa"
          fields={suspensos.fields}
          onAdd={() => suspensos.append(emptyDebito)}
          onRemove={(idx) => suspensos.remove(idx)}
        />

        <DebitosSection
          title="PGFN — Dívida Ativa"
          control={control}
          fieldName="pgfn.debitos"
          fields={pgfn.fields}
          onAdd={() => pgfn.append(emptyDebito)}
          onRemove={(idx) => pgfn.remove(idx)}
        />

        <Section title="Metadados">
          <Grid2>
            <SimpleField
              control={control}
              name="metadados_relatorio.data_emissao"
              label="Data de emissão"
              placeholder="YYYY-MM-DD"
            />
            <SimpleField
              control={control}
              name="metadados_relatorio.cpf_certificado"
              label="CPF do certificado"
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

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "positive" | "warning"
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : ""
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

function SimpleField(props: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  name: string
  label: string
  placeholder?: string
  type?: string
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
              type={props.type ?? "text"}
              placeholder={props.placeholder}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function DebitosSection(props: {
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  fieldName:
    | "pendencias_sief"
    | "debitos_exigibilidade_suspensa"
    | "pgfn.debitos"
  fields: Array<{ id: string }>
  onAdd: () => void
  onRemove: (idx: number) => void
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <Section title={props.title}>
      {props.fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum débito nesta categoria.
        </p>
      )}
      <div className="space-y-2">
        {props.fields.map((row, idx) => {
          const isOpen = openIdx === idx
          return (
            <div key={row.id} className="rounded-lg border bg-background">
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/40"
              >
                <DebitoSummary control={props.control} base={`${props.fieldName}.${idx}`} />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {isOpen ? "Fechar" : "Editar"}
                  </span>
                </div>
              </button>
              {isOpen && (
                <div className="space-y-3 border-t p-3">
                  <Grid2>
                    <SimpleField
                      control={props.control}
                      name={`${props.fieldName}.${idx}.receita_codigo`}
                      label="Código"
                    />
                    <SimpleField
                      control={props.control}
                      name={`${props.fieldName}.${idx}.receita_descricao`}
                      label="Descrição"
                    />
                    <SimpleField
                      control={props.control}
                      name={`${props.fieldName}.${idx}.periodo_apuracao`}
                      label="Período"
                      placeholder="03/2025"
                    />
                    <SimpleField
                      control={props.control}
                      name={`${props.fieldName}.${idx}.data_vencimento`}
                      label="Vencimento"
                      placeholder="YYYY-MM-DD"
                    />
                    <NumberField
                      control={props.control}
                      name={`${props.fieldName}.${idx}.valor_original`}
                      label="Valor original"
                    />
                    <NumberField
                      control={props.control}
                      name={`${props.fieldName}.${idx}.saldo_devedor`}
                      label="Saldo devedor"
                    />
                    <NumberField
                      control={props.control}
                      name={`${props.fieldName}.${idx}.multa`}
                      label="Multa"
                      nullable
                    />
                    <NumberField
                      control={props.control}
                      name={`${props.fieldName}.${idx}.juros`}
                      label="Juros"
                      nullable
                    />
                    <NumberField
                      control={props.control}
                      name={`${props.fieldName}.${idx}.saldo_consolidado`}
                      label="Saldo consolidado"
                      nullable
                    />
                    <SimpleField
                      control={props.control}
                      name={`${props.fieldName}.${idx}.situacao`}
                      label="Situação"
                    />
                  </Grid2>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        props.onRemove(idx)
                        setOpenIdx(null)
                      }}
                    >
                      <Trash2Icon className="mr-1 size-4" />
                      Remover débito
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={props.onAdd}>
        <PlusIcon className="mr-1 size-4" />
        Adicionar débito
      </Button>
    </Section>
  )
}

function DebitoSummary({
  control,
  base,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  base: string
}) {
  const codigo = useWatchSafe(control, `${base}.receita_codigo`)
  const periodo = useWatchSafe(control, `${base}.periodo_apuracao`)
  const saldo = useWatchSafe(control, `${base}.saldo_devedor`)
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
      <span className="font-mono text-xs text-muted-foreground">
        {codigo || "—"}
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="text-xs">{periodo || "—"}</span>
      <span className="ml-auto pr-2 text-xs font-medium">
        {typeof saldo === "number" ? brl(saldo) : "—"}
      </span>
    </div>
  )
}

// useWatch tipado livre (any) por causa de paths dinâmicos
function useWatchSafe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>,
  name: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useWatch({ control, name }) as any
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
                value={field.value === null || field.value === undefined ? "" : String(field.value)}
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
