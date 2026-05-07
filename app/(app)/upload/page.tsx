import {
  CheckCircle2Icon,
  FileTextIcon,
  LandmarkIcon,
  WalletIcon,
} from "lucide-react"

import { UploadDropzone } from "@/components/upload/UploadDropzone"

export default function UploadPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Upload de PDFs</h1>
        <p className="text-sm text-muted-foreground">
          Envie até 3 PDFs por vez. O sistema detecta o tipo de documento e
          extrai os dados antes da revisão.
        </p>
      </header>

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
