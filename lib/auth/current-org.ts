import "server-only"

import { createClient } from "@/lib/supabase/server"

export interface CurrentOrgContext {
  userId: string
  organizationId: string
  role: "owner" | "admin" | "member"
}

/**
 * Resolve a organização ativa do usuário autenticado. No MVP cada usuário só
 * pertence a uma org; quando suportarmos múltiplas, este helper passa a olhar
 * um cookie/preferência. Lança se não houver sessão ou se não houver vínculo.
 */
export async function getCurrentOrg(): Promise<CurrentOrgContext> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("not_authenticated")
  }

  const { data: membership, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (memberError) throw memberError
  if (!membership) {
    throw new Error("no_organization")
  }

  return {
    userId: user.id,
    organizationId: membership.organization_id as string,
    role: membership.role as CurrentOrgContext["role"],
  }
}
