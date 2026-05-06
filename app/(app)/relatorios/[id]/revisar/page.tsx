export default async function RevisarRelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Revisar relatório {id}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Placeholder (Sprint 0). Form de revisão renderizado pelo handler entra
        no Sprint 2.
      </p>
    </main>
  )
}
