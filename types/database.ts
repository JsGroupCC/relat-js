// Tipos do banco. Regenerar com:
//   npx supabase gen types typescript --project-id <ref> > types/database.ts
//
// Até a primeira execução do gerador, este arquivo é mantido manualmente,
// espelhando exatamente o schema de db/migrations/20260506000000_initial_schema.sql.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type RelatorioStatus =
  | "pending"
  | "extracting"
  | "reviewing"
  | "verified"
  | "failed"

export type OrgRole = "owner" | "admin" | "member"

// ---- Rows ------------------------------------------------------------------
export type OrganizationRow = {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
}
export type OrganizationInsert = {
  id?: string
  name: string
  slug: string
  plan?: string
  created_at?: string
}
export type OrganizationUpdate = Partial<OrganizationInsert>

export type OrganizationMemberRow = {
  organization_id: string
  user_id: string
  role: OrgRole
  created_at: string
}
export type OrganizationMemberInsert = {
  organization_id: string
  user_id: string
  role: OrgRole
  created_at?: string
}
export type OrganizationMemberUpdate = Partial<OrganizationMemberInsert>

export type EmpresaRow = {
  id: string
  organization_id: string
  cnpj: string
  razao_social: string | null
  nome_fantasia: string | null
  metadata: Json
  created_at: string
  updated_at: string
}
export type EmpresaInsert = {
  id?: string
  organization_id: string
  cnpj: string
  razao_social?: string | null
  nome_fantasia?: string | null
  metadata?: Json
  created_at?: string
  updated_at?: string
}
export type EmpresaUpdate = Partial<EmpresaInsert>

export type RelatorioRow = {
  id: string
  organization_id: string
  empresa_id: string | null
  document_type: string
  pdf_path: string
  pdf_filename: string
  pdf_size_bytes: number | null
  pdf_sha256: string | null
  data_emissao_documento: string | null
  status: RelatorioStatus
  error_message: string | null
  uploaded_by: string | null
  created_at: string
  verified_at: string | null
}
export type RelatorioInsert = {
  id?: string
  organization_id: string
  empresa_id?: string | null
  document_type: string
  pdf_path: string
  pdf_filename: string
  pdf_size_bytes?: number | null
  pdf_sha256?: string | null
  data_emissao_documento?: string | null
  status?: RelatorioStatus
  error_message?: string | null
  uploaded_by?: string | null
  created_at?: string
  verified_at?: string | null
}
export type RelatorioUpdate = Partial<RelatorioInsert>

export type ExtracaoRow = {
  id: string
  relatorio_id: string
  raw_json: Json
  verified_json: Json | null
  llm_provider: string | null
  llm_model: string | null
  tokens_input: number | null
  tokens_output: number | null
  cost_usd: number | null
  created_at: string
}
export type ExtracaoInsert = {
  id?: string
  relatorio_id: string
  raw_json: Json
  verified_json?: Json | null
  llm_provider?: string | null
  llm_model?: string | null
  tokens_input?: number | null
  tokens_output?: number | null
  cost_usd?: number | null
  created_at?: string
}
export type ExtracaoUpdate = Partial<ExtracaoInsert>

export type DebitoRow = {
  id: string
  organization_id: string
  empresa_id: string
  relatorio_id: string
  tipo: string
  receita_codigo: string | null
  receita_descricao: string | null
  periodo_apuracao: string | null
  data_vencimento: string | null
  valor_original: number | null
  saldo_devedor: number | null
  multa: number | null
  juros: number | null
  saldo_consolidado: number | null
  situacao: string | null
  created_at: string
}
export type DebitoInsert = {
  id?: string
  organization_id: string
  empresa_id: string
  relatorio_id: string
  tipo: string
  receita_codigo?: string | null
  receita_descricao?: string | null
  periodo_apuracao?: string | null
  data_vencimento?: string | null
  valor_original?: number | null
  saldo_devedor?: number | null
  multa?: number | null
  juros?: number | null
  saldo_consolidado?: number | null
  situacao?: string | null
  created_at?: string
}
export type DebitoUpdate = Partial<DebitoInsert>

export type RelatorioShareRow = {
  id: string
  organization_id: string
  relatorio_id: string
  token: string
  created_by: string | null
  created_at: string
  expires_at: string | null
  revoked_at: string | null
  view_count: number
  last_viewed_at: string | null
}
export type RelatorioShareInsert = {
  id?: string
  organization_id: string
  relatorio_id: string
  token: string
  created_by?: string | null
  created_at?: string
  expires_at?: string | null
  revoked_at?: string | null
  view_count?: number
  last_viewed_at?: string | null
}
export type RelatorioShareUpdate = Partial<RelatorioShareInsert>

// ---- Database --------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow
        Insert: OrganizationInsert
        Update: OrganizationUpdate
        Relationships: []
      }
      organization_members: {
        Row: OrganizationMemberRow
        Insert: OrganizationMemberInsert
        Update: OrganizationMemberUpdate
        Relationships: []
      }
      empresas: {
        Row: EmpresaRow
        Insert: EmpresaInsert
        Update: EmpresaUpdate
        Relationships: []
      }
      relatorios: {
        Row: RelatorioRow
        Insert: RelatorioInsert
        Update: RelatorioUpdate
        Relationships: []
      }
      extracoes: {
        Row: ExtracaoRow
        Insert: ExtracaoInsert
        Update: ExtracaoUpdate
        Relationships: []
      }
      debitos: {
        Row: DebitoRow
        Insert: DebitoInsert
        Update: DebitoUpdate
        Relationships: []
      }
      relatorio_shares: {
        Row: RelatorioShareRow
        Insert: RelatorioShareInsert
        Update: RelatorioShareUpdate
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
