export async function dispatchTranscode(job: {
  id: string;
  sourceKey: string;
  filename: string;
  targetRatio: number;
}) {
  const owner = process.env.GITHUB_REPO_OWNER!;
  const repo = process.env.GITHUB_REPO_NAME!;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GH_PAT}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_type: "process-episode",
      client_payload: {
        job_id: job.id,
        source_key: job.sourceKey,
        original_filename: job.filename,
        target_ratio: job.targetRatio,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao disparar workflow no GitHub: ${res.status} ${await res.text()}`);
  }
}
