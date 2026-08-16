import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { presignUpload, presignDownload, uploadKeyFor } from "@/lib/r2";
import { createJob, listJobs } from "@/lib/kv";

export async function POST(req: NextRequest) {
  const { filename, contentType } = await req.json();
  if (!filename || typeof filename !== "string") {
    return NextResponse.json({ error: "filename é obrigatório" }, { status: 400 });
  }

  const id = randomUUID();
  const sourceKey = uploadKeyFor(id, filename);
  const uploadUrl = await presignUpload(sourceKey, contentType || "application/octet-stream");

  await createJob({
    id,
    filename,
    sourceKey,
    status: "pending_upload",
    createdAt: Date.now(),
  });

  return NextResponse.json({ id, uploadUrl, sourceKey });
}

export async function GET() {
  const jobs = await listJobs();
  const withUrls = await Promise.all(
    jobs.map(async (job) => ({
      ...job,
      downloadUrl:
        job.status === "done" && job.outputKey ? await presignDownload(job.outputKey) : undefined,
    }))
  );
  return NextResponse.json({ jobs: withUrls });
}
