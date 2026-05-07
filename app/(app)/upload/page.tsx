import {
  AlertCircleIcon,
  Building2Icon,
  CheckCircle2Icon,
  FileTextIcon,
  LandmarkIcon,
  WalletIcon,
} from "lucide-react"

import { UploadDropzone } from "@/components/upload/UploadDropzone"
import { getCurrentOrg } from "@/lib/auth/current-org"
import { createClient } from "@/lib/supabase/server"
import { formatCnpj, stripCnpj } from "@/lib/utils/cnpj"

interface SearchParams {
  empresa?: string
}

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const empresaCnpj = params.empresa ? stripCnpj(params.empresa) : null
  const empresa = empresaCnpj ? await loadEmpresa(empresaCnpj) : null

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Upload de PDFs</h1>
        <p className="text-sm text-muted-foreground">
          Envie até 3 PDFs por vez. O sistema detecta o tipo de documento e
          extrai os dados antes da revisão.
        </p>
      </header>

      {empresa && (
        <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <Building2Icon className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="flex-1 text-sm">
            <p className="font-medium">
              Subindo para: {empresa.razao_social ?? formatCnpj(empresa.cnpj)}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {formatCnpj(empresa.cnpj)}
            </p>
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertCircleIcon className="mt-0.5 size-3 shrink-0" />
              <span>
                A empresa final é definida pelo CNPJ que aparece dentro do
                PDF — se você subir um documento de outro cliente, ele vai
                pra esse outro cliente. Esse aviso é só pra te lembrar do
                contexto.
              </span>
            </p>
          </div>
        </div>
      )}

      <UploadDropzone />

      <section className="rounded-lg border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tipos suportados hoje
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
          <li className="flex items-start gap-2">
            <LandmarkIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <strong className="block">Federal RFB/PGFN</strong>
              <span className="text-xs text-muted-foreground">
                Relatório de Situação Fiscal
              </span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <strong className="block">Estadual SEFAZ-RN</strong>
              <span className="text-xs text-muted-foreground">
                Extrato Fiscal do Contribuinte
              </span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <WalletIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <strong className="block">Municipal Natal</strong>
              <span className="text-xs text-muted-foreground">
                Lista de Pendências do Contribuinte
              </span>
            </span>
          </li>
        </ul>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2Icon className="size-3.5 text-emerald-600" />
          Outros tipos (CND, DARF, DAS, DCTF) chegam em breve.
        </p>
      </section>
    </main>
  )
}

async function loadEmpresa(
  cnpj: string,
): Promise<{ cnpj: string; razao_social: string | null } | null> {
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
