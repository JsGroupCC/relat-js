"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { recordAudit } from "@/lib/audit/log"
import { getCurrentOrg } from "@/lib/auth/current-org"
import { createClient } from "@/lib/supabase/server"

const addMemberSchema = z.object({
  email: z.email("E-mail inválido."),
  role: z.enum(["admin", "member"]),
})

const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "member"]),
})

const removeMemberSchema = z.object({
  userId: z.string().uuid(),
})

export interface MembersActionResult {
  ok: boolean
  error?: string
}

function ensureCanManage(role: "owner" | "admin" | "member") {
  if (role !== "owner" && role !== "admin") {
    throw new Error("Você não tem permissão para gerenciar membros.")
  }
}

export async function addMemberAction(
  _prev: MembersActionResult | undefined,
  formData: FormData,
): Promise<MembersActionResult> {
  const ctx = await getCurrentOrg()
  ensureCanManage(ctx.role)

  const parsed = addMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido." }
  }

  const supabase = await createClient()

  const { data: userIdRaw, error: rpcError } = await supabase.rpc(
    "find_user_id_by_email" as never,
    { p_email: parsed.data.email } as never,
  )
  if (rpcError) return { ok: false, error: rpcError.message }
  const userId = userIdRaw as string | null
  if (!userId) {
    return {
      ok: false,
      error:
        "Nenhum usuário encontrado com esse e-mail. Peça para a pessoa fazer signup primeiro.",
    }
  }

  // Já é membro?
  const { data: existing } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", ctx.organizationId)
    .eq("user_id", userId)
    .maybeSingle()
  if (existing) {
    return { ok: false, error: "Esse usuário já é membro." }
  }

  const { error: insertError } = await supabase.from("organization_members").insert({
    organization_id: ctx.organizationId,
    user_id: userId,
    role: parsed.data.role,
  })
  if (insertError) return { ok: false, error: insertError.message }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "member.add",
    resourceType: "user",
    resourceId: userId,
    metadata: { email: parsed.data.email, role: parsed.data.role },
  })

  revalidatePath("/configuracoes/membros")
  return { ok: true }
}

export async function changeMemberRoleAction(
  userId: string,
  newRole: "owner" | "admin" | "member",
): Promise<MembersActionResult> {
  const ctx = await getCurrentOrg()
  ensureCanManage(ctx.role)

  const parsed = changeRoleSchema.safeParse({ userId, role: newRole })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido." }
  }

  if (parsed.data.userId === ctx.userId) {
    return { ok: false, error: "Você não pode mudar o seu próprio papel." }
  }

  // Promover para owner: só outro owner pode.
  if (parsed.data.role === "owner" && ctx.role !== "owner") {
    return { ok: false, error: "Apenas owners podem promover outros owners." }
  }

  const supabase = await createClient()

  const { data: previous } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", ctx.organizationId)
    .eq("user_id", parsed.data.userId)
    .maybeSingle()

  const { error } = await supabase
    .from("organization_members")
    .update({ role: parsed.data.role })
    .eq("organization_id", ctx.organizationId)
    .eq("user_id", parsed.data.userId)
  if (error) return { ok: false, error: error.message }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "member.role_change",
    resourceType: "user",
    resourceId: parsed.data.userId,
    metadata: {
      from: previous?.role ?? null,
      to: parsed.data.role,
    },
  })

  revalidatePath("/configuracoes/membros")
  return { ok: true }
}

export async function removeMemberAction(userId: string): Promise<MembersActionResult> {
  const ctx = await getCurrentOrg()
  ensureCanManage(ctx.role)

  const parsed = removeMemberSchema.safeParse({ userId })
  if (!parsed.success) {
    return { ok: false, error: "userId inválido." }
  }

  if (parsed.data.userId === ctx.userId) {
    return { ok: false, error: "Use a tela de organização para sair." }
  }

  const supabase = await createClient()

  // Garante que sobra ao menos 1 owner depois da remoção.
  const { data: target } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", ctx.organizationId)
    .eq("user_id", parsed.data.userId)
    .maybeSingle()
  if (target?.role === "owner") {
    const { count: ownerCount } = await supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId)
      .eq("role", "owner")
    if ((ownerCount ?? 0) <= 1) {
      return {
        ok: false,
        error: "Não é possível remover o último owner da organização.",
      }
    }
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", ctx.organizationId)
    .eq("user_id", parsed.data.userId)
  if (error) return { ok: false, error: error.message }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "member.remove",
    resourceType: "user",
    resourceId: parsed.data.userId,
    metadata: { previous_role: target?.role ?? null },
  })

  revalidatePath("/configuracoes/membros")
  return { ok: true }
}
