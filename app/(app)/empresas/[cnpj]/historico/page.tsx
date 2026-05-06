export default async function HistoricoEmpresaPage({
  params,
}: {
  params: Promise<{ cnpj: string }>
}) {
  const { cnpj } = await params
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Histórico de {cnpj}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Placeholder (Sprint 0). Linha do tempo entra no Sprint 3.
      </p>
    </main>
  )
}
