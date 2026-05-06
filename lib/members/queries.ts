import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { createClient } from "@/lib/supabase/server"

export interface MemberRow {
  user_id: string
  email: string
  role: "owner" | "admin" | "member"
  created_at: string
}

export async function listMembers(): Promise<MemberRow[]> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data, error } = await supabase.rpc(
    "list_organization_members" as never,
    { org_id: ctx.organizationId } as never,
  )
  if (error) throw error

  return ((data as unknown as MemberRow[]) ?? []).map((m) => ({
    ...m,
    role: m.role as MemberRow["role"],
  }))
}
