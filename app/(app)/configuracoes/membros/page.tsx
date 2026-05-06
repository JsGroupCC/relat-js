import { AddMemberForm } from "@/components/members/AddMemberForm"
import { MembersTable } from "@/components/members/MembersTable"
import { getCurrentOrg } from "@/lib/auth/current-org"
import { listMembers } from "@/lib/members/queries"

export default async function MembrosPage() {
  const ctx = await getCurrentOrg()
  const members = await listMembers()
  const canManage = ctx.role === "owner" || ctx.role === "admin"

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Membros</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie quem tem acesso à sua organização. Para adicionar uma pessoa,
          ela precisa já ter feito signup no relat-js.
        </p>
      </header>

      {canManage && (
        <section className="rounded-lg border bg-muted/20 p-4">
          <AddMemberForm />
        </section>
      )}

      <section className="rounded-lg border">
        <MembersTable
          members={members}
          currentUserId={ctx.userId}
          currentRole={ctx.role}
        />
      </section>
    </main>
  )
}
