import { UploadDropzone } from "@/components/upload/UploadDropzone"

export default function UploadPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-6 space-y-1">
        <h1 className="text-xl font-semibold">Upload de PDFs</h1>
        <p className="text-sm text-muted-foreground">
          Envie até 3 PDFs por vez. O sistema detecta o tipo de documento e
          extrai os dados antes da revisão.
        </p>
      </header>
      <UploadDropzone />
    </main>
  )
}
