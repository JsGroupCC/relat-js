"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { CarteiraRow } from "@/lib/empresas/carteira-types"

interface Props {
  rows: CarteiraRow[]
  /** quantos topo mostrar; default 10 */
  limit?: number
}

/**
 * Barras horizontais com as N empresas que mais devem. Útil pra bater o
 * olho e identificar concentração de risco.
 */
export function CarteiraChart({ rows, limit = 10 }: Props) {
  const data = rows
    .filter((r) => r.total_geral > 0)
    .slice(0, limit)
    .map((r) => ({
      empresa: shorten(r.razao_social ?? r.cnpj, 28),
      total: r.total_geral,
    }))
    .reverse() // recharts horizontal: maior fica em cima quando reversed

  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Nenhuma empresa com débito ainda.
      </div>
    )
  }

  const height = Math.max(200, data.length * 28 + 40)

  return (
    <div className="rounded-lg border p-3">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted"
            horizontal={false}
          />
          <XAxis
            type="number"
            fontSize={10}
            tickFormatter={(v) => brlCompact(Number(v))}
          />
          <YAxis
            type="category"
            dataKey="empresa"
            width={170}
            fontSize={11}
            tick={{ fill: "currentColor" }}
            className="text-muted-foreground"
          />
          <Tooltip
            formatter={(v) => brl(Number(v))}
            cursor={{ className: "fill-muted/40" }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid hsl(var(--border))",
            }}
          />
          <Bar
            dataKey="total"
            radius={[0, 4, 4, 0]}
            className="fill-amber-500/80"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function shorten(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…"
}

function brl(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n)
}

function brlCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `R$ ${Math.round(n / 1000)}k`
  return brl(n)
}
