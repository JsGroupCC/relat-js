import Link from "next/link"
import {
  ArrowRightIcon,
  Building2Icon,
  CheckCircle2Icon,
  LandmarkIcon,
  XCircleIcon,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { DocumentCategory } from "@/lib/documents/types"
import type { SourceSnapshot } from "@/lib/empresas/snapshot"

interface Props {
  snapshot: SourceSnapshot
}

const CATEGORY_ICON: Record<DocumentCategory, typeof LandmarkIcon> = {
  fiscal: LandmarkIcon,
  tributario: Building2Icon,
  previdenciario: Building2Icon,
  outros: Building2Icon,
}

export function SourceCard({ snapshot }: Props) {
  const { documentType, handler, relatorio, summary } = snapshot

  // total_geral é o único campo garantido pelo DocumentSummary base
  const total = typeof summary.total_geral === "number" ? summary.total_geral : 0
  const qtd =
    typeof summary.quantidade_debitos === "number"
      ? summary.quantidade_debitos
      : 0

  // Status simples: total_geral === 0 → ok; > 0 → pendência
  const isOk = total === 0
  const Icon = isOk ? CheckCircle2Icon : XCircleIcon
  const iconTone = isOk ? "text-emerald-600" : "text-amber-600"

  const CatIcon = CATEGORY_ICON[handler.category] ?? Building2Icon

  return (
    <Link href={`/relatorios/${relatorio.id}`} className="block">
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <CatIcon className="size-3" />
                {handler.category}
              </p>
              <p className="font-medium leading-tight">{handler.displayName}</p>
            </div>
            <Icon className={`size-5 shrink-0 ${iconTone}`} />
          </div>

          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Total devido</p>
            <p
              className={`text-2xl font-semibold tabular-nums ${
                isOk ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {brl(total)}
            </p>
            <p className="text-xs text-muted-foreground">
              {qtd} lançamento{qtd === 1 ? "" : "s"}
              {relatorio.data_emissao_documento && (
                <> · emitido em {formatDate(relatorio.data_emissao_documento)}</>
              )}
            </p>
          </div>

          <div className="flex items-center justify-end text-xs text-muted-foreground">
            Ver detalhes
            <ArrowRightIcon className="ml-1 size-3" />
          </div>

          {/* Document type badge — útil pra debugging */}
          <span className="sr-only">document_type={documentType}</span>
        </CardContent>
      </Card>
    </Link>
  )
}

function brl(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n)
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}
