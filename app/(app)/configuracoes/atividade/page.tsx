import Link from "next/link"
import {
  ArrowLeftIcon,
  Building2Icon,
  ClockIcon,
  FileTextIcon,
  Link2Icon,
  Link2OffIcon,
  PencilIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserMinusIcon,
  UserPlusIcon,
  UserRoundIcon,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listRecentAudit, type AuditLogEntryView } from "@/lib/audit/queries"

const ACTION_LABEL: Record<string, string> = {
  "empresa.create": "Criou empresa",
  "empresa.update": "Editou empresa",
  "empresa.delete": "Excluiu empresa",
  "relatorio.delete": "Excluiu relatório",
  "relatorio.verify": "Confirmou revisão",
  "share.create": "Gerou link público",
  "share.revoke": "Revogou link público",
  "member.add": "Adicionou membro",
  "member.remove": "Removeu membro",
  "member.role_change": "Alterou papel de membro",
  "org.create": "Criou organização",
  "user.signup": "Fez signup",
}

const ACTION_ICON: Record<string, typeof Building2Icon> = {
  "empresa.create": Building2Icon,
  "empresa.update": PencilIcon,
  "empresa.delete": Trash2Icon,
  "relatorio.delete": Trash2Icon,
  "relatorio.verify": ShieldCheckIcon,
  "share.create": Link2Icon,
  "share.revoke": Link2OffIcon,
  "member.add": UserPlusIcon,
  "member.remove": UserMinusIcon,
  "member.role_change": UserRoundIcon,
  "org.create": Building2Icon,
  "user.signup": UserRoundIcon,
}

export default async function AtividadePage() {
  const entries = await listRecentAudit(100)

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-1">
        <Link
          href="/configuracoes"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          Configurações
        </Link>
        <h1 className="text-xl font-semibold">Atividade</h1>
        <p className="text-sm text-muted-foreground">
          Últimos {entries.length} eventos da sua organização. Mostra quem fez
          o quê e quando.
        </p>
      </header>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <ClockIcon className="size-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">Sem atividade ainda.</p>
              <p className="text-sm text-muted-foreground">
                Conforme você usa o sistema, ações importantes vão aparecer aqui.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
            <CardDescription>
              Inclui criação/edição/exclusão de empresas e relatórios, links
              públicos, mudanças de membros e signup.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {entries.map((e) => (
                <AuditRow key={e.id} entry={e} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Link
        href="/configuracoes"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeftIcon className="mr-2 size-4" />
        Voltar
      </Link>
    </main>
  )
}

function AuditRow({ entry }: { entry: AuditLogEntryView }) {
  const Icon =
    ACTION_ICON[entry.action] ??
    (entry.resource_type === "relatorio" ? FileTextIcon : ClockIcon)
  const label = ACTION_LABEL[entry.action] ?? entry.action
  const summary = describeMetadata(entry)

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{label}</span>
          {summary && (
            <span className="ml-1.5 text-muted-foreground">— {summary}</span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {entry.user_email ?? "(sistema)"} · {formatRelative(entry.created_at)}
        </p>
      </div>
    </li>
  )
}

function describeMetadata(entry: AuditLogEntryView): string | null {
  const meta = (entry.metadata ?? null) as Record<string, unknown> | null
  if (!meta) return null

  if (entry.action === "empresa.create" || entry.action === "empresa.update" || entry.action === "empresa.delete") {
    const razao = typeof meta.razao_social === "string" ? meta.razao_social : null
    const cnpj = typeof meta.cnpj === "string" ? meta.cnpj : null
    return razao ?? cnpj ?? null
  }
  if (entry.action === "relatorio.delete") {
    return typeof meta.pdf_filename === "string" ? meta.pdf_filename : null
  }
  if (entry.action === "relatorio.verify") {
    const dt = typeof meta.document_type === "string" ? meta.document_type : null
    const count = typeof meta.debitos_count === "number" ? meta.debitos_count : null
    if (dt && count !== null) return `${dt} · ${count} débito${count === 1 ? "" : "s"}`
    return dt
  }
  if (entry.action === "member.add") {
    const email = typeof meta.email === "string" ? meta.email : null
    const role = typeof meta.role === "string" ? meta.role : null
    if (email && role) return `${email} (${role})`
    return email ?? role
  }
  if (entry.action === "member.role_change") {
    const from = typeof meta.from === "string" ? meta.from : null
    const to = typeof meta.to === "string" ? meta.to : null
    if (from && to) return `${from} → ${to}`
    return to
  }
  if (entry.action === "org.create") {
    return typeof meta.name === "string" ? meta.name : null
  }
  if (entry.action === "user.signup") {
    return typeof meta.email === "string" ? meta.email : null
  }
  return null
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return "agora"
  if (diffMin < 60) return `${diffMin}m atrás`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h atrás`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d atrás`
  return d.toLocaleString("pt-BR")
}
