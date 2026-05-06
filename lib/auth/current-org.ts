import "server-only"

import { cookies } from "next/headers"

import { createClient } from "@/lib/supabase/server"

export const ACTIVE_ORG_COOKIE = "active_organization_id"

export interface CurrentOrgContext {
  userId: string
  organizationId: string
  role: "owner" | "admin" | "member"
}

/**
 * Resolve a organização ativa do usuário:
 *   1) tenta o cookie `active_organization_id` (se válido para o usuário)
 *   2) cai no primeiro membership por created_at
 *
 * Lança "not_authenticated" se não houver sessão e "no_organization" se o
 * usuário não tem nenhuma org ainda.
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

  const cookieStore = await cookies()
  const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null

  if (cookieOrgId) {
    const { data: viaCookie } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("organization_id", cookieOrgId)
      .maybeSingle()
    if (viaCookie) {
      return {
        userId: user.id,
        organizationId: viaCookie.organization_id,
        role: viaCookie.role as CurrentOrgContext["role"],
      }
    }
  }

  const { data: fallback, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (memberError) throw memberError
  if (!fallback) throw new Error("no_organization")

  return {
    userId: user.id,
    organizationId: fallback.organization_id,
    role: fallback.role as CurrentOrgContext["role"],
  }
}

export interface OrgListItem {
  id: string
  name: string
  slug: string
  role: "owner" | "admin" | "member"
}

/**
 * Lista todas as orgs em que o usuário autenticado é membro.
 */
export async function listMyOrganizations(): Promise<OrgListItem[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
  if (error) throw error
  if (!memberships || memberships.length === 0) return []

  const orgIds = memberships.map((m) => m.organization_id)
  const { data: orgs, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .in("id", orgIds)
  if (orgError) throw orgError

  const roleByOrgId = new Map(memberships.map((m) => [m.organization_id, m.role]))
  return (orgs ?? [])
    .map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      role: (roleByOrgId.get(o.id) ?? "member") as OrgListItem["role"],
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
