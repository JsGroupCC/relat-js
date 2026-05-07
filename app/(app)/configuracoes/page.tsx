import Link from "next/link"
import { ClockIcon, UsersIcon } from "lucide-react"

import { getCurrentOrg, listMyOrganizations } from "@/lib/auth/current-org"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ConfiguracoesPage() {
  const ctx = await getCurrentOrg()
  const orgs = await listMyOrganizations()
  const activeOrg = orgs.find((o) => o.id === ctx.organizationId)

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Organização ativa: <strong>{activeOrg?.name ?? "—"}</strong> · seu
          papel: <strong className="capitalize">{ctx.role}</strong>
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link href="/configuracoes/membros" className="block">
          <Card className="transition-colors hover:bg-muted/30">
            <CardHeader>
              <UsersIcon className="size-6 text-muted-foreground" />
              <CardTitle className="text-base">Membros</CardTitle>
              <CardDescription>
                Convide e gerencie quem tem acesso à organização.
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </Link>

        <Link href="/configuracoes/atividade" className="block">
          <Card className="transition-colors hover:bg-muted/30">
            <CardHeader>
              <ClockIcon className="size-6 text-muted-foreground" />
              <CardTitle className="text-base">Atividade</CardTitle>
              <CardDescription>
                Histórico de ações: empresas, relatórios, links públicos e
                membros.
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </Link>
      </div>
    </main>
  )
}
