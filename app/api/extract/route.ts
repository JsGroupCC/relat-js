import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", message: "Extraction pipeline arrives in Sprint 1." },
    { status: 501 },
  )
}
