#!/usr/bin/env node
// Atualiza o status de um job no Upstash Redis via REST, sem depender de
// nenhum pacote npm (usa apenas fetch nativo do Node) para que o workflow
// do GitHub Actions não precise rodar `npm install`.
//
// Uso: node status.mjs <jobId> campo=valor [campo=valor ...]

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN não configurados");
  process.exit(1);
}

const [jobId, ...pairs] = process.argv.slice(2);
if (!jobId || pairs.length === 0) {
  console.error("Uso: status.mjs <jobId> campo=valor [campo=valor ...]");
  process.exit(1);
}

async function upstash(command) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    throw new Error(`Upstash respondeu ${res.status}: ${await res.text()}`);
  }
  return (await res.json()).result;
}

function coerce(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value !== "" && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

const key = `job:${jobId}`;
const current = await upstash(["GET", key]);
const job = current ? JSON.parse(current) : { id: jobId };

for (const pair of pairs) {
  const eq = pair.indexOf("=");
  if (eq === -1) continue;
  const field = pair.slice(0, eq);
  job[field] = coerce(pair.slice(eq + 1));
}
job.updatedAt = Date.now();

await upstash(["SET", key, JSON.stringify(job)]);
await upstash(["SADD", "jobs:index", jobId]);

console.log(`job:${jobId} ->`, job);
