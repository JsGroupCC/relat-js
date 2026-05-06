"use client"

import { ArrowRightIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TimePoint } from "@/lib/empresas/timeseries"

interface Props {
  points: TimePoint[]
}

export function HistoricoCompare({ points }: Props) {
  const sorted = useMemo(
    () => [...points].sort((a, b) => b.date.localeCompare(a.date)),
    [points],
  )
  const [aId, setAId] = useState<string>(sorted[1]?.relatorioId ?? sorted[0]?.relatorioId ?? "")
  const [bId, setBId] = useState<string>(sorted[0]?.relatorioId ?? "")

  const a = sorted.find((p) => p.relatorioId === aId)
  const b = sorted.find((p) => p.relatorioId === bId)

  if (sorted.length < 2) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          São necessários ao menos 2 relatórios verificados desta empresa para
          comparar.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparar dois relatórios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <PickRelatorio label="Antes" value={aId} options={sorted} onChange={setAId} />
          <ArrowRightIcon className="mb-2 size-5 text-muted-foreground" />
          <PickRelatorio label="Depois" value={bId} options={sorted} onChange={setBId} />
        </div>

        {a && b && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Métrica</th>
                  <th className="py-2 text-right">{a.date}</th>
                  <th className="py-2 text-right">{b.date}</th>
                  <th className="py-2 text-right">Δ</th>
                </tr>
              </thead>
              <tbody>
                <Row label="Total devido (CND)" before={a.total_geral} after={b.total_geral} />
                <Row label="Pendências SIEF" before={a.total_sief} after={b.total_sief} />
                <Row label="PGFN" before={a.total_pgfn} after={b.total_pgfn} />
                <Row
                  label="Exigibilidade suspensa"
                  before={a.total_suspenso}
                  after={b.total_suspenso}
                />
                <Row
                  label="Quantidade de débitos"
                  before={a.quantidade_debitos}
                  after={b.quantidade_debitos}
                  format="int"
                />
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PickRelatorio({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: TimePoint[]
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v) onChange(v)
        }}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((p) => (
            <SelectItem key={p.relatorioId} value={p.relatorioId}>
              {p.date}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function Row({
  label,
  before,
  after,
  format = "brl",
}: {
  label: string
  before: number
  after: number
  format?: "brl" | "int"
}) {
  const delta = after - before
  const fmt = format === "brl" ? brl : (n: number) => n.toString()
  const sign = delta > 0 ? "+" : ""
  const tone =
    delta === 0
      ? "text-muted-foreground"
      : delta > 0
        ? "text-amber-600"
        : "text-emerald-600"
  return (
    <tr className="border-t">
      <td className="py-2 font-medium">{label}</td>
      <td className="py-2 text-right tabular-nums">{fmt(before)}</td>
      <td className="py-2 text-right tabular-nums">{fmt(after)}</td>
      <td className={`py-2 text-right font-medium tabular-nums ${tone}`}>
        {sign}
        {fmt(delta)}
      </td>
    </tr>
  )
}

function brl(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n)
}
