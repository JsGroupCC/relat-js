"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { recordAudit } from "@/lib/audit/log"
import { createClient } from "@/lib/supabase/server"

const loginSchema = z.object({
  email: z.email("E-mail inválido."),
  password: z.string().min(1, "Senha obrigatória."),
})

const signupSchema = z.object({
  email: z.email("E-mail inválido."),
  password: z.string().min(8, "Senha precisa ter ao menos 8 caracteres."),
  orgName: z.string().min(2, "Nome da organização obrigatório."),
})

export interface AuthFormState {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function loginAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    return { ok: false, error: translateAuthError(error.message) }
  }

  redirect("/dashboard")
}

export async function signupAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    orgName: formData.get("orgName"),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) {
    return { ok: false, error: translateAuthError(error.message) }
  }

  const userId = data.user?.id
  if (!userId) {
    return {
      ok: false,
      error:
        "Cadastro criado mas sem confirmação automática. Verifique o e-mail e tente o login.",
    }
  }

  // Cria a org e linka como owner. RLS exige que o user já esteja autenticado
  // — após signUp, a sessão é estabelecida automaticamente.
  const slug = slugify(parsed.data.orgName)
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: parsed.data.orgName, slug })
    .select("id")
    .single()
  if (orgError || !org) {
    return {
      ok: false,
      error: `Falha ao criar organização: ${orgError?.message ?? "desconhecido"}`,
    }
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: userId,
      role: "owner",
    })
  if (memberError) {
    return { ok: false, error: `Falha ao linkar membership: ${memberError.message}` }
  }

  await recordAudit({
    organizationId: org.id,
    userId,
    action: "user.signup",
    resourceType: "user",
    resourceId: userId,
    metadata: { email: parsed.data.email },
  })
  await recordAudit({
    organizationId: org.id,
    userId,
    action: "org.create",
    resourceType: "organization",
    resourceId: org.id,
    metadata: { name: parsed.data.orgName, slug },
  })

  redirect("/dashboard")
}

export async function signoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "E-mail ou senha inválidos."
  }
  if (message.includes("User already registered")) {
    return "Já existe um usuário com esse e-mail."
  }
  if (message.includes("Email not confirmed")) {
    return "Confirme seu e-mail antes de fazer login."
  }
  return message
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}
