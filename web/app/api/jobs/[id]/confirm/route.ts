import { NextRequest, NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/kv";
import { dispatchTranscode } from "@/lib/github";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const job = await getJob(params.id);
  if (!job) {
    return NextResponse.json({ error: "job não encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const targetRatio = typeof body.targetRatio === "number" ? body.targetRatio : 0.2;

  await updateJob(job.id, { status: "queued" });
  await dispatchTranscode({
    id: job.id,
    sourceKey: job.sourceKey,
    filename: job.filename,
    targetRatio,
  });

  return NextResponse.json({ ok: true });
}
