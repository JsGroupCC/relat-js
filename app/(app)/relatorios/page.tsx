import Link from "next/link"
import { FileTextIcon, UploadCloudIcon } from "lucide-react"

import { RelatoriosList } from "@/components/relatorios/RelatoriosList"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listAllRelatorios } from "@/lib/relatorios/queries-list"
import type { RelatorioStatus } from "@/types/database"

const STATUS_LABEL: Record<RelatorioStatus, string> = {
  pending: "Pendente",
  extracting: "Extraindo",
  reviewing: "Aguarda revisão",
  verified: "Verificado",
  failed: "Falhou",
}

interface SearchParams {
  status?: string | string[]
}

export default async function RelatoriosIndexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const statusFilter = parseStatusFilter(params.status)
  const all = await listAllRelatorios({ status: statusFilter })

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Todos os relatórios</h1>
          <p className="text-sm text-muted-foreground">
            {all.length} relatório{all.length === 1 ? "" : "s"}
            {statusFilter && (
              <>
                {" "}
                · filtrando: {statusFilter.map((s) => STATUS_LABEL[s]).join(", ")}
              </>
            )}
          </p>
        </div>
        <Link
          href="/upload"
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          <UploadCloudIcon className="mr-2 size-4" />
          Novo upload
        </Link>
      </header>

      <FilterBar active={statusFilter} />

      {all.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <FileTextIcon className="size-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">
                {statusFilter
                  ? "Nenhum relatório com esses filtros."
                  : "Nenhum relatório ainda."}
              </p>
              <p className="text-sm text-muted-foreground">
                {statusFilter
                  ? "Tente trocar o filtro ou suba um novo PDF."
                  : "Suba um PDF fiscal para começar."}
              </p>
            </div>
            <Link
              href="/upload"
              className={buttonVariants({ variant: "default" })}
            >
              <UploadCloudIcon className="mr-2 size-4" />
              Fazer upload
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista</CardTitle>
            <CardDescription>
              Ordenados por data de upload (mais recente primeiro).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RelatoriosList relatorios={all} />
          </CardContent>
        </Card>
      )}
    </main>
  )
}

function FilterBar({ active }: { active: RelatorioStatus[] | undefined }) {
  const filters: Array<{ key: string; label: string; statuses: RelatorioStatus[] | null }> = [
    { key: "all", label: "Todos", statuses: null },
    { key: "reviewing", label: "Aguardando revisão", statuses: ["reviewing"] },
    { key: "verified", label: "Verificados", statuses: ["verified"] },
    { key: "failed", label: "Falhas", statuses: ["failed"] },
    {
      key: "extracting",
      label: "Em extração",
      statuses: ["pending", "extracting"],
    },
  ]
  const activeKey = !active
    ? "all"
    : active.length === 1
      ? active[0]
      : active.includes("extracting")
        ? "extracting"
        : "all"

  return (
    <nav className="flex flex-wrap gap-1">
      {filters.map((f) => {
        const isActive = activeKey === f.key
        const href =
          f.statuses === null
            ? "/relatorios"
            : `/relatorios?status=${f.statuses.join(",")}`
        return (
          <Link
            key={f.key}
            href={href}
            className={
              isActive
                ? buttonVariants({ variant: "default", size: "sm" })
                : buttonVariants({ variant: "ghost", size: "sm" })
            }
          >
            {f.label}
          </Link>
        )
      })}
    </nav>
  )
}

function parseStatusFilter(
  raw: SearchParams["status"],
): RelatorioStatus[] | undefined {
  if (!raw) return undefined
  const valid: RelatorioStatus[] = [
    "pending",
    "extracting",
    "reviewing",
    "verified",
    "failed",
  ]
  const list = Array.isArray(raw) ? raw.flatMap((s) => s.split(",")) : raw.split(",")
  const filtered = list.filter((s): s is RelatorioStatus =>
    valid.includes(s as RelatorioStatus),
  )
  return filtered.length > 0 ? filtered : undefined
}

