"use server"

import { revalidatePath } from "next/cache"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { createClient } from "@/lib/supabase/server"
import { sanitizeFilename } from "@/lib/utils/filename"

export interface UploadResult {
  relatorioId: string
  filename: string
}

const MAX_PDF_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_PDFS = 3

export async function uploadRelatoriosAction(
  formData: FormData,
): Promise<UploadResult[]> {
  const files = formData.getAll("files").filter(isFile)
  if (files.length === 0) {
    throw new Error("Nenhum arquivo enviado.")
  }
  if (files.length > MAX_PDFS) {
    throw new Error(`Máximo ${MAX_PDFS} arquivos por upload.`)
  }
  for (const file of files) {
    if (file.type !== "application/pdf") {
      throw new Error(`Arquivo ${file.name} não é PDF.`)
    }
    if (file.size > MAX_PDF_BYTES) {
      throw new Error(`Arquivo ${file.name} excede o limite de 10 MB.`)
    }
  }

  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const results: UploadResult[] = []

  for (const file of files) {
    const filename = sanitizeFilename(file.name)

    const { data: relatorio, error: insertError } = await supabase
      .from("relatorios")
      .insert({
        organization_id: ctx.organizationId,
        document_type: "unknown",
        pdf_path: "pending",
        pdf_filename: filename,
        pdf_size_bytes: file.size,
        status: "pending",
        uploaded_by: ctx.userId,
      })
      .select("id")
      .single()

    if (insertError || !relatorio) {
      throw insertError ?? new Error("Falha ao criar relatório.")
    }

    const path = `${ctx.organizationId}/${relatorio.id}/${filename}`

    const { error: uploadError } = await supabase.storage
      .from("fiscal-documents")
      .upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (uploadError) {
      await supabase.from("relatorios").delete().eq("id", relatorio.id)
      throw uploadError
    }

    const { error: updateError } = await supabase
      .from("relatorios")
      .update({ pdf_path: path })
      .eq("id", relatorio.id)
    if (updateError) throw updateError

    results.push({ relatorioId: relatorio.id, filename })
  }

  revalidatePath("/upload")
  revalidatePath("/dashboard")

  return results
}

function isFile(value: FormDataEntryValue): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value
}
