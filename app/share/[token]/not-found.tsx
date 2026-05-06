import { LinkIcon } from "lucide-react"

export default function ShareNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <LinkIcon className="size-10 text-muted-foreground" />
      <div className="space-y-1 max-w-md">
        <h1 className="text-xl font-semibold">Link inválido ou expirado</h1>
        <p className="text-sm text-muted-foreground">
          Este link pode ter sido revogado pelo profissional que o enviou,
          expirado, ou estar incorreto. Peça um link novo ao seu contador.
        </p>
      </div>
    </main>
  )
}
