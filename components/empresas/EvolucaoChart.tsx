"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { TimePoint } from "@/lib/empresas/timeseries"

interface Props {
  points: TimePoint[]
  metric: keyof Pick<
    TimePoint,
    "total_geral" | "total_sief" | "total_pgfn" | "total_suspenso"
  >
  title: string
}

export function EvolucaoChart({ points, metric, title }: Props) {
  if (points.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        Sem histórico suficiente para mostrar evolução.
      </div>
    )
  }

  const data = points.map((p) => ({
    date: p.date,
    value: p[metric],
  }))

  return (
    <div className="rounded-lg border p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" fontSize={10} />
            <YAxis fontSize={10} tickFormatter={(v) => brlCompact(Number(v))} />
            <Tooltip formatter={(v) => brl(Number(v))} cursor={{ className: "fill-muted/40" }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="currentColor"
              strokeWidth={2}
              dot={{ r: 3 }}
              className="text-foreground/80"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function brl(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n)
}

function brlCompact(n: number): string {
  if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toFixed(0)}k`
  return brl(n)
}
