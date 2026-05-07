import { Building2Icon, PlusIcon } from "lucide-react"

import { CreateEmpresaForm } from "@/components/empresas/CreateEmpresaForm"
import { EmpresasList } from "@/components/empresas/EmpresasList"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listEmpresas } from "@/lib/empresas/queries"

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
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {empresas.length} empresa{empresas.length === 1 ? "" : "s"}
          </h2>
          <EmpresasList empresas={empresas} />
        </section>
      )}
    </main>
  )
}
