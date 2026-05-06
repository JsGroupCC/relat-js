import { LoginForm } from "@/components/auth/LoginForm"
import { Logo } from "@/components/brand/Logo"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3">
        <Logo variant="auto" size={56} priority />
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Análise fiscal automatizada
        </p>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Acesse sua conta para subir e analisar relatórios fiscais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        © JS Group · Relatórios fiscais para contadores
      </p>
    </main>
  )
}
