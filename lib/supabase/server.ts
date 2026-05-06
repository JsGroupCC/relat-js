import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import type { Database } from "@/types/database"

/**
 * Server-side Supabase client. Use em Server Components, Server Actions e
 * Route Handlers. Respeita RLS (usa a sessão do usuário). Não use admin/service
 * role aqui.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Component: não pode setar cookies. O middleware refresca.
          }
        },
      },
    },
  )
}
