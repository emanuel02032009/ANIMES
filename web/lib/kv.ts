import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export type JobStatus = "pending_upload" | "queued" | "processing" | "done" | "error";

export type Job = {
  id: string;
  filename: string;
  sourceKey: string;
  status: JobStatus;
  stage?: string;
  createdAt: number;
  updatedAt?: number;
  outputKey?: string;
  outputBytes?: number;
  originalBytes?: number;
  achievedRatio?: number;
  error?: string;
};

const jobKey = (id: string) => `job:${id}`;
const INDEX_KEY = "jobs:index";

export async function createJob(job: Job) {
  await redis.set(jobKey(job.id), JSON.stringify(job));
  await redis.sadd(INDEX_KEY, job.id);
}

export async function getJob(id: string): Promise<Job | null> {
  const raw = await redis.get<string>(jobKey(id));
  if (!raw) return null;
  return typeof raw === "string" ? (JSON.parse(raw) as Job) : (raw as unknown as Job);
}

export async function updateJob(id: string, patch: Partial<Job>) {
  const current = await getJob(id);
  if (!current) throw new Error(`job ${id} não encontrado`);
  const next: Job = { ...current, ...patch, updatedAt: Date.now() };
  await redis.set(jobKey(id), JSON.stringify(next));
  return next;
}

export async function listJobs(): Promise<Job[]> {
  const ids = await redis.smembers(INDEX_KEY);
  if (!ids.length) return [];
  const jobs = await Promise.all(ids.map((id) => getJob(id)));
  return jobs
    .filter((j): j is Job => !!j)
    .sort((a, b) => b.createdAt - a.createdAt);
}
