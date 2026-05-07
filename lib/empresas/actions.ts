"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { recordAudit } from "@/lib/audit/log"
import { getCurrentOrg } from "@/lib/auth/current-org"
import { createClient } from "@/lib/supabase/server"
import { isValidCnpj, stripCnpj } from "@/lib/utils/cnpj"

const createSchema = z.object({
  cnpj: z
    .string()
    .min(11)
    .refine((v) => isValidCnpj(v), { message: "CNPJ inválido." }),
  razao_social: z.string().min(2, "Razão social muito curta."),
  nome_fantasia: z.string().optional().nullable(),
})

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
})

const deleteSchema = z.object({ id: z.string().uuid() })

export interface EmpresasActionState {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function createEmpresaAction(
  _prev: EmpresasActionState | undefined,
  formData: FormData,
): Promise<EmpresasActionState> {
  const ctx = await getCurrentOrg()

  const parsed = createSchema.safeParse({
    cnpj: formData.get("cnpj"),
    razao_social: formData.get("razao_social"),
    nome_fantasia: formData.get("nome_fantasia") || null,
  })
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()
  const cnpj = stripCnpj(parsed.data.cnpj)

  const { data: existing } = await supabase
    .from("empresas")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("cnpj", cnpj)
    .maybeSingle()
  if (existing) {
    return { ok: false, error: "Já existe uma empresa com esse CNPJ." }
  }

  const { data: created, error } = await supabase
    .from("empresas")
    .insert({
      organization_id: ctx.organizationId,
      cnpj,
      razao_social: parsed.data.razao_social,
      nome_fantasia: parsed.data.nome_fantasia ?? null,
    })
    .select("id")
    .single()
  if (error) return { ok: false, error: error.message }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "empresa.create",
    resourceType: "empresa",
    resourceId: created.id,
    metadata: { cnpj, razao_social: parsed.data.razao_social },
  })

  revalidatePath("/empresas")
  redirect(`/empresas/${cnpj}`)
}

export async function updateEmpresaAction(
  _prev: EmpresasActionState | undefined,
  formData: FormData,
): Promise<EmpresasActionState> {
  const ctx = await getCurrentOrg()

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    cnpj: formData.get("cnpj"),
    razao_social: formData.get("razao_social"),
    nome_fantasia: formData.get("nome_fantasia") || null,
  })
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()
  const cnpjClean = stripCnpj(parsed.data.cnpj)
  const { error } = await supabase
    .from("empresas")
    .update({
      cnpj: cnpjClean,
      razao_social: parsed.data.razao_social,
      nome_fantasia: parsed.data.nome_fantasia ?? null,
    })
    .eq("id", parsed.data.id)
    .eq("organization_id", ctx.organizationId)
  if (error) return { ok: false, error: error.message }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "empresa.update",
    resourceType: "empresa",
    resourceId: parsed.data.id,
    metadata: { cnpj: cnpjClean, razao_social: parsed.data.razao_social },
  })

  revalidatePath("/empresas")
  return { ok: true }
}

export async function deleteEmpresaAction(id: string) {
  const ctx = await getCurrentOrg()
  const parsed = deleteSchema.safeParse({ id })
  if (!parsed.success) throw new Error("ID inválido.")

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("empresas")
    .select("cnpj, razao_social")
    .eq("id", parsed.data.id)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle()

  const { error } = await supabase
    .from("empresas")
    .delete()
    .eq("id", parsed.data.id)
    .eq("organization_id", ctx.organizationId)
  if (error) throw error

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "empresa.delete",
    resourceType: "empresa",
    resourceId: parsed.data.id,
    metadata: existing
      ? { cnpj: existing.cnpj, razao_social: existing.razao_social }
      : null,
  })

  revalidatePath("/empresas")
  redirect("/empresas")
}
