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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { computeSummary, TIPO_LABEL } from "./compute"
import {
  pendenciaTipoEnum,
  pendenciasIssNatalSchema,
  type PendenciaIss,
  type PendenciasIssNatal,
} from "./schema"

interface Props {
  relatorioId: string
  data: PendenciasIssNatal
}

const emptyPendencia: PendenciaIss = {
  origem: "",
  tipo: "outros",
  tipo_descricao: "",
  referencia: "",
  parcela: 0,
  data_vencimento: "",
  valor_original: 0,
  valor_apropriado: null,
  saldo_devedor: 0,
}

export function ReviewForm({ relatorioId, data }: Props) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<PendenciasIssNatal>({
    resolver: zodResolver(pendenciasIssNatalSchema),
    defaultValues: data,
    mode: "onBlur",
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const control = form.control as Control<any>

  const pendencias = useFieldArray({
    control: form.control,
    name: "pendencias",
  })

  const watched = useWatch({ control: form.control }) as
    | PendenciasIssNatal
    | undefined
  const summary = (() => {
    if (!watched) return null
    try {
      return computeSummary(watched)
    } catch {
      return null
    }
  })()

  const onSubmit = (values: PendenciasIssNatal) => {
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
            <Stat label="ISS SN" value={brl(summary.total_iss_simples_nacional)} />
            <Stat label="ISS Homologado" value={brl(summary.total_iss_homologado)} />
            <Stat
              label="Vencido"
              value={brl(summary.vencido)}
              tone={summary.vencido > 0 ? "warning" : undefined}
            />
          </div>
        )}

        <Section title="Contribuinte">
          <Grid2>
            <SimpleField control={control} name="contribuinte.cnpj" label="CPF/CNPJ" />
            <SimpleField
              control={control}
              name="contribuinte.razao_social"
              label="Razão social"
            />
            <SimpleField
              control={control}
              name="contribuinte.data_posicao"
              label="Data da posição"
              placeholder="2026-05-06T16:15:04"
            />
            <SimpleField
              control={control}
              name="metadados_relatorio.data_emissao"
              label="Data de emissão"
              placeholder="YYYY-MM-DD"
            />
          </Grid2>
        </Section>

        <Section title={`Pendências (${pendencias.fields.length})`}>
          {pendencias.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma pendência cadastrada.
            </p>
          )}
          <div className="space-y-2">
            {pendencias.fields.map((row, idx) => (
              <PendenciaRow
                key={row.id}
                control={control}
                base={`pendencias.${idx}`}
                onRemove={() => pendencias.remove(idx)}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => pendencias.append(emptyPendencia)}
          >
            <PlusIcon className="mr-1 size-4" />
            Adicionar pendência
          </Button>
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

function PendenciaRow({
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
  const tipoDescricao = useWatch({
    control,
    name: `${base}.tipo_descricao`,
  }) as string
  const referencia = useWatch({ control, name: `${base}.referencia` }) as string
  const valorOriginal = useWatch({
    control,
    name: `${base}.valor_original`,
  }) as number

  return (
    <div className="rounded-lg border bg-background">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/40"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
          <span className="truncate font-medium">{tipoDescricao || "—"}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs">{referencia || "—"}</span>
          <span className="ml-auto pr-2 text-xs font-medium">
            {typeof valorOriginal === "number" ? brl(valorOriginal) : "—"}
          </span>
        </div>
      </button>
      {open && (
        <div className="space-y-3 border-t p-3">
          <Grid2>
            <SimpleField control={control} name={`${base}.origem`} label="Origem" />
            <FormField
              control={control}
              name={`${base}.tipo`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => v && field.onChange(v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pendenciaTipoEnum.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {TIPO_LABEL[opt]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SimpleField
              control={control}
              name={`${base}.tipo_descricao`}
              label="Descrição"
            />
            <SimpleField
              control={control}
              name={`${base}.referencia`}
              label="Referência"
              placeholder="03/2025"
            />
            <NumberField
              control={control}
              name={`${base}.parcela`}
              label="Parcela"
            />
            <SimpleField
              control={control}
              name={`${base}.data_vencimento`}
              label="Vencimento"
              placeholder="YYYY-MM-DD"
            />
            <NumberField
              control={control}
              name={`${base}.valor_original`}
              label="Valor original"
            />
            <NumberField
              control={control}
              name={`${base}.valor_apropriado`}
              label="Valor apropriado"
              nullable
            />
            <NumberField
              control={control}
              name={`${base}.saldo_devedor`}
              label="Saldo devedor"
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
