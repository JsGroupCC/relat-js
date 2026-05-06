// Tipos do banco. Regenerar com:
//   npx supabase gen types typescript --project-id <ref> > types/database.ts
//
// Sprint 0: stub mínimo. Substituído pelo gerador no Sprint 1 quando a primeira
// migration estiver aplicada.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
