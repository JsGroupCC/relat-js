export default async function RelatorioDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Relatório {id}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Placeholder (Sprint 0). Dashboard renderizado pelo handler do tipo de
        documento entra no Sprint 2.
      </p>
    </main>
  )
}
