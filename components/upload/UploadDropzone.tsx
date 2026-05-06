"use client"

import { useRouter } from "next/navigation"
import { FileIcon, Loader2, UploadCloudIcon, XIcon } from "lucide-react"
import { useCallback, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { uploadRelatoriosAction } from "@/lib/upload/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const MAX_PDFS = 3
const MAX_BYTES = 10 * 1024 * 1024

type FileStatus = "queued" | "uploading" | "extracting" | "ready" | "failed"

interface QueueItem {
  file: File
  status: FileStatus
  message?: string
  relatorioId?: string
}

export function UploadDropzone() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<QueueItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [isPending, startTransition] = useTransition()

  const onSelect = useCallback((files: FileList | File[] | null) => {
    if (!files) return
    const list = Array.from(files)
    const validated: QueueItem[] = []
    for (const file of list) {
      if (file.type !== "application/pdf") {
        toast.error(`${file.name} não é um PDF.`)
        continue
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} excede 10 MB.`)
        continue
      }
      validated.push({ file, status: "queued" })
    }
    setItems((prev) => {
      const next = [...prev, ...validated].slice(0, MAX_PDFS)
      if (validated.length + prev.length > MAX_PDFS) {
        toast.warning(`Limite de ${MAX_PDFS} PDFs por upload.`)
      }
      return next
    })
  }, [])

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = () => {
    const pending = items.filter((i) => i.status === "queued")
    if (pending.length === 0) {
      toast.error("Adicione ao menos um PDF.")
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      for (const item of pending) {
        formData.append("files", item.file, item.file.name)
      }

      setItems((prev) =>
        prev.map((i) =>
          i.status === "queued" ? { ...i, status: "uploading" } : i,
        ),
      )

      let uploadResults: { relatorioId: string; filename: string }[]
      try {
        uploadResults = await uploadRelatoriosAction(formData)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha no upload."
        setItems((prev) =>
          prev.map((i) =>
            i.status === "uploading"
              ? { ...i, status: "failed", message: msg }
              : i,
          ),
        )
        toast.error(msg)
        return
      }

      // Casa cada resultado com o item da fila por ordem.
      const queueIdxs = items
        .map((it, idx) => (it.status === "queued" ? idx : -1))
        .filter((idx) => idx >= 0)

      setItems((prev) => {
        const next = [...prev]
        uploadResults.forEach((res, i) => {
          const targetIdx = queueIdxs[i]
          if (targetIdx != null && next[targetIdx]) {
            next[targetIdx] = {
              ...next[targetIdx],
              status: "extracting",
              relatorioId: res.relatorioId,
            }
          }
        })
        return next
      })

      // Dispara extração serial (uma chamada por relatório).
      for (const res of uploadResults) {
        try {
          const r = await fetch("/api/extract", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ relatorioId: res.relatorioId }),
          })
          const body = (await r.json().catch(() => ({}))) as {
            error?: string
            message?: string
          }
          if (!r.ok) {
            throw new Error(body.message || body.error || "Falha na extração.")
          }
          setItems((prev) =>
            prev.map((it) =>
              it.relatorioId === res.relatorioId
                ? { ...it, status: "ready" }
                : it,
            ),
          )
          toast.success(`${res.filename}: pronto para revisão.`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Falha na extração."
          setItems((prev) =>
            prev.map((it) =>
              it.relatorioId === res.relatorioId
                ? { ...it, status: "failed", message: msg }
                : it,
            ),
          )
          toast.error(`${res.filename}: ${msg}`)
        }
      }

      router.refresh()
    })
  }

  const allReady =
    items.length > 0 && items.every((i) => i.status === "ready")
  const firstReady = items.find((i) => i.status === "ready")

  return (
    <div className="space-y-4">
      <Card
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          onSelect(e.dataTransfer.files)
        }}
        className={cn(
          "border-2 border-dashed transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-muted",
        )}
      >
        <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <UploadCloudIcon className="size-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Arraste seus PDFs aqui</p>
            <p className="text-sm text-muted-foreground">
              ou clique para selecionar — até {MAX_PDFS} arquivos, máx 10 MB cada
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={isPending || items.length >= MAX_PDFS}
          >
            Selecionar arquivos
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              onSelect(e.target.files)
              e.target.value = ""
            }}
          />
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            {items.map((item, idx) => (
              <FileRow
                key={idx}
                item={item}
                onRemove={
                  item.status === "queued" ? () => removeItem(idx) : undefined
                }
              />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {items.length === 0
            ? "Nenhum arquivo selecionado."
            : `${items.length} arquivo${items.length > 1 ? "s" : ""} na fila.`}
        </p>
        <div className="flex gap-2">
          {allReady && firstReady?.relatorioId && (
            <Button
              type="button"
              onClick={() =>
                router.push(`/relatorios/${firstReady.relatorioId}/revisar`)
              }
            >
              Ir para revisão
            </Button>
          )}
          <Button
            type="button"
            onClick={onSubmit}
            disabled={
              isPending || items.filter((i) => i.status === "queued").length === 0
            }
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Enviar e extrair
          </Button>
        </div>
      </div>
    </div>
  )
}

function FileRow({
  item,
  onRemove,
}: {
  item: QueueItem
  onRemove?: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <FileIcon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.file.name}</p>
        <p className="text-xs text-muted-foreground">
          {(item.file.size / 1024 / 1024).toFixed(2)} MB · {statusLabel(item)}
        </p>
        {item.message && (
          <p className="mt-1 text-xs text-destructive">{item.message}</p>
        )}
      </div>
      {item.status === "uploading" || item.status === "extracting" ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : null}
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label="Remover"
        >
          <XIcon className="size-4" />
        </Button>
      )}
    </div>
  )
}

function statusLabel(item: QueueItem): string {
  switch (item.status) {
    case "queued":
      return "na fila"
    case "uploading":
      return "enviando para o storage…"
    case "extracting":
      return "extraindo dados via LLM…"
    case "ready":
      return "pronto para revisão"
    case "failed":
      return "falhou"
  }
}
