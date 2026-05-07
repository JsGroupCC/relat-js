"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { CarteiraEvolucaoPoint } from "@/lib/empresas/carteira-evolucao"

interface Props {
  points: CarteiraEvolucaoPoint[]
}

/**
 * Gráfico de área da evolução do total da carteira nos últimos N dias
 * (decididos pelo caller). Pula pontos sem snapshot — não interpola.
 *
 * Se tiver < 2 pontos, mostra placeholder porque não dá pra plotar
 * tendência com 1 amostra.
 */
export function CarteiraEvolucaoChart({ points }: Props) {
  if (points.length < 2) {
    return (
      <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        Sem dados suficientes pra mostrar evolução. Snapshots começam a ser
        gravados a partir da próxima confirmação de relatório.
      </div>
    )
  }

  const data = points.map((p) => ({
    date: formatDateShort(p.date),
    valor: p.total_geral,
  }))

  return (
    <div className="rounded-lg border p-3">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="carteira-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(245 158 11)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="rgb(245 158 11)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            fontSize={10}
            tickMargin={4}
            tick={{ fill: "currentColor" }}
            className="text-muted-foreground"
          />
          <YAxis
            fontSize={10}
            tickFormatter={(v) => brlCompact(Number(v))}
            tick={{ fill: "currentColor" }}
            className="text-muted-foreground"
            width={48}
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
          <Area
            type="monotone"
            dataKey="valor"
            stroke="rgb(245 158 11)"
            strokeWidth={2}
            fill="url(#carteira-grad)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
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
