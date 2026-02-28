import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { caseid: string } }
) {
  return NextResponse.json({ ok: true, caseid: params.caseid });
}
