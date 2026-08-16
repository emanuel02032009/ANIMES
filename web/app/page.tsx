"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Job = {
  id: string;
  filename: string;
  status: "pending_upload" | "queued" | "processing" | "done" | "error";
  stage?: string;
  createdAt: number;
  outputBytes?: number;
  originalBytes?: number;
  achievedRatio?: number;
  error?: string;
  downloadUrl?: string;
};

const STATUS_LABEL: Record<Job["status"], string> = {
  pending_upload: "enviando...",
  queued: "na fila",
  processing: "processando",
  done: "concluído",
  error: "erro",
};

function formatBytes(bytes?: number) {
  if (!bytes) return "-";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [uploading, setUploading] = useState(false);
  const [targetRatio, setTargetRatio] = useState(0.2);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshJobs = useCallback(async () => {
    const res = await fetch("/api/jobs");
    const data = await res.json();
    setJobs(data.jobs ?? []);
  }, []);

  useEffect(() => {
    refreshJobs();
    const interval = setInterval(refreshJobs, 3000);
    return () => clearInterval(interval);
  }, [refreshJobs]);

  async function uploadOne(file: File) {
    const createRes = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    const { id, uploadUrl } = await createRes.json();

    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    await fetch(`/api/jobs/${id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetRatio }),
    });
  }

  async function handleUpload() {
    const files = inputRef.current?.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadOne(file);
      }
      if (inputRef.current) inputRef.current.value = "";
      await refreshJobs();
    } finally {
      setUploading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>VHS/CRT Anime Converter</h1>
      <p style={{ opacity: 0.8 }}>
        Envie episódios (.mp4/.mkv). Cada um recebe o filtro estético VHS/CRT e é comprimido
        para o tamanho-alvo abaixo, rodando no GitHub Actions.
      </p>

      <section style={{ margin: "1.5rem 0", padding: "1rem", background: "#1c1c1c", borderRadius: 8 }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Tamanho final desejado (% do original):{" "}
          <input
            type="number"
            min={5}
            max={90}
            value={Math.round(targetRatio * 100)}
            onChange={(e) => setTargetRatio(Number(e.target.value) / 100)}
            style={{ width: 60 }}
          />
          %
        </label>

        <input ref={inputRef} type="file" accept=".mp4,.mkv" multiple />
        <button onClick={handleUpload} disabled={uploading} style={{ marginLeft: "0.5rem" }}>
          {uploading ? "Enviando..." : "Processar episódios"}
        </button>
      </section>

      <section>
        <h2>Jobs</h2>
        {jobs.length === 0 && <p style={{ opacity: 0.6 }}>Nenhum job ainda.</p>}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {jobs.map((job) => (
            <li
              key={job.id}
              style={{
                padding: "0.75rem",
                marginBottom: "0.5rem",
                background: "#1c1c1c",
                borderRadius: 8,
              }}
            >
              <strong>{job.filename}</strong>
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                status: {STATUS_LABEL[job.status]}
                {job.stage ? ` (${job.stage})` : ""}
                {job.status === "done" &&
                  ` — ${formatBytes(job.originalBytes)} → ${formatBytes(job.outputBytes)}` +
                    (job.achievedRatio ? ` (${Math.round(job.achievedRatio * 100)}% do original)` : "")}
                {job.status === "error" && job.error ? ` — ${job.error}` : ""}
              </div>
              {job.downloadUrl && (
                <a href={job.downloadUrl} download>
                  Baixar
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
