import Link from "next/link"
import { Building2Icon, PlusIcon } from "lucide-react"

import { CreateEmpresaForm } from "@/components/empresas/CreateEmpresaForm"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listEmpresas } from "@/lib/empresas/queries"
import { formatCnpj } from "@/lib/utils/cnpj"

export default async function EmpresasPage() {
  const empresas = await listEmpresas()

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Empresas</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre os CNPJs que você atende. Empresas também são criadas
            automaticamente quando um relatório fiscal é processado.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlusIcon className="size-4" />
            Adicionar empresa
          </CardTitle>
          <CardDescription>CNPJ e razão social.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateEmpresaForm />
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {empresas.length} empresa{empresas.length === 1 ? "" : "s"}
        </h2>
        {empresas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
              <Building2Icon className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">Nenhuma empresa cadastrada.</p>
              <p className="text-sm text-muted-foreground">
                Cadastre uma acima ou faça upload de um relatório fiscal para
                criar automaticamente.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {empresas.map((e) => (
              <Link key={e.id} href={`/empresas/${e.cnpj}`}>
                <Card className="h-full transition-colors hover:bg-muted/30">
                  <CardContent className="space-y-2 p-4">
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        {e.razao_social ?? "(sem razão social)"}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatCnpj(e.cnpj)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {e.relatorios_count} relatório
                        {e.relatorios_count === 1 ? "" : "s"}
                      </span>
                      {e.ultimo_relatorio_at && (
                        <span>
                          Último{" "}
                          {new Date(e.ultimo_relatorio_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
