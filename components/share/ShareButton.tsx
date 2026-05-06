"use client"

import {
  CheckIcon,
  CopyIcon,
  Loader2Icon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  createShareLinkAction,
  revokeShareLinkAction,
} from "@/lib/share/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  relatorioId: string
}

export function ShareButton({ relatorioId }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const onOpen = () => {
    setOpen(true)
    if (shareUrl) return
    startTransition(async () => {
      const res = await createShareLinkAction(relatorioId)
      if (!res.ok) {
        toast.error(res.error ?? "Não foi possível gerar o link.")
        setOpen(false)
        return
      }
      if (res.url) setShareUrl(res.url)
    })
  }

  const onCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("Link copiado.")
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Não foi possível copiar.")
    }
  }

  const onRevoke = () => {
    if (!confirm("Revogar este link? O cliente perderá acesso imediatamente.")) {
      return
    }
    startTransition(async () => {
      const res = await revokeShareLinkAction(relatorioId)
      if (!res.ok) {
        toast.error(res.error ?? "Falha ao revogar.")
        return
      }
      setShareUrl(null)
      setOpen(false)
      toast.success("Link revogado.")
    })
  }

  const onWhatsApp = () => {
    if (!shareUrl) return
    const text = encodeURIComponent(
      `Olá! Aqui está a análise da sua situação fiscal:\n\n${shareUrl}`,
    )
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer")
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={onOpen}>
        <Share2Icon className="mr-2 size-4" />
        Compartilhar com cliente
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compartilhar análise</DialogTitle>
            <DialogDescription>
              Link público com a versão simplificada do relatório, pensada
              para o cliente entender. Não exige login.
            </DialogDescription>
          </DialogHeader>

          {pending && !shareUrl ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2Icon className="mr-2 size-4 animate-spin" />
              Gerando link…
            </div>
          ) : shareUrl ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="share-url" className="text-xs">
                  URL do link
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="share-url"
                    readOnly
                    value={shareUrl}
                    onClick={(e) => e.currentTarget.select()}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCopy}
                    aria-label="Copiar link"
                  >
                    {copied ? (
                      <CheckIcon className="size-4" />
                    ) : (
                      <CopyIcon className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                Quem tiver este link consegue ver o relatório. Não compartilhe
                publicamente. Você pode revogar quando quiser.
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRevoke}
                  disabled={pending}
                >
                  <Trash2Icon className="mr-1.5 size-4" />
                  Revogar
                </Button>
                <Button type="button" size="sm" onClick={onWhatsApp}>
                  Abrir WhatsApp
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
