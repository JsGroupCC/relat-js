import Link from "next/link"
import { Building2Icon, FileTextIcon, UploadCloudIcon, XIcon } from "lucide-react"

import { RelatoriosList } from "@/components/relatorios/RelatoriosList"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentOrg } from "@/lib/auth/current-org"
import { listAllRelatorios } from "@/lib/relatorios/queries-list"
import { createClient } from "@/lib/supabase/server"
import { formatCnpj, stripCnpj } from "@/lib/utils/cnpj"
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
  cnpj?: string
}

interface ActiveEmpresa {
  cnpj: string
  razao_social: string | null
}

export default async function RelatoriosIndexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const statusFilter = parseStatusFilter(params.status)
  const cnpjFilter = params.cnpj ? stripCnpj(params.cnpj) : undefined

  const [all, activeEmpresa] = await Promise.all([
    listAllRelatorios({ status: statusFilter, cnpj: cnpjFilter }),
    cnpjFilter ? loadActiveEmpresa(cnpjFilter) : Promise.resolve(null),
  ])

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">
            {activeEmpresa
              ? `Relatórios de ${activeEmpresa.razao_social ?? formatCnpj(activeEmpresa.cnpj)}`
              : "Todos os relatórios"}
          </h1>
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

      {activeEmpresa && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <Building2Icon className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">Filtrando por empresa:</span>
          <span className="font-medium">
            {activeEmpresa.razao_social ?? formatCnpj(activeEmpresa.cnpj)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatCnpj(activeEmpresa.cnpj)}
          </span>
          <Link
            href={`/empresas/${activeEmpresa.cnpj}`}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Ver empresa →
          </Link>
          <Link
            href={
              statusFilter
                ? `/relatorios?status=${statusFilter.join(",")}`
                : "/relatorios"
            }
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3" />
            Limpar filtro
          </Link>
        </div>
      )}

      <FilterBar active={statusFilter} cnpj={cnpjFilter} />

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

function FilterBar({
  active,
  cnpj,
}: {
  active: RelatorioStatus[] | undefined
  cnpj: string | undefined
}) {
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

  // Preserva o ?cnpj= ao trocar de status, pra não perder o filtro de empresa
  const buildHref = (statuses: RelatorioStatus[] | null) => {
    const parts: string[] = []
    if (statuses) parts.push(`status=${statuses.join(",")}`)
    if (cnpj) parts.push(`cnpj=${cnpj}`)
    return parts.length === 0 ? "/relatorios" : `/relatorios?${parts.join("&")}`
  }

  return (
    <nav className="flex flex-wrap gap-1">
      {filters.map((f) => {
        const isActive = activeKey === f.key
        return (
          <Link
            key={f.key}
            href={buildHref(f.statuses)}
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

async function loadActiveEmpresa(
  cnpj: string,
): Promise<ActiveEmpresa | null> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()
  const { data } = await supabase
    .from("empresas")
    .select("cnpj, razao_social")
    .eq("organization_id", ctx.organizationId)
    .eq("cnpj", cnpj)
    .maybeSingle()
  return data
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

