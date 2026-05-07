import path from "node:path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      // Default Next 16 é 1MB. Upload aceita 3 PDFs × 10MB = 30MB no pior
      // caso, então subimos pra 32MB. ⚠️ Em Vercel Hobby o teto efetivo é
      // 4.5MB independente desse valor — pra produção em hobby, ou reduz
      // MAX_PDFS pra 1 ou migra pra upload com signed URL direto pro
      // Supabase Storage (bypassa Server Action).
      bodySizeLimit: "32mb",
    },
  },
}

export default nextConfig
