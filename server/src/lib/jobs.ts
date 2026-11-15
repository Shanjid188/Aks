// Minimal in-process scheduler for maintenance jobs (privacy purges, syncs).
// A JobLock row makes each run exclusive, so a second API process (e.g. during
// a rolling restart) never runs the same job concurrently.
import { prisma } from './prisma.ts';

export interface JobDef {
  name: string;
  everyMs: number;
  /** Returns a short, non-personal summary stored on the lock row. */
  run: () => Promise<string>;
}

const jobs: JobDef[] = [];

export function registerJob(job: JobDef): void {
  jobs.push(job);
}

/** Try to take the lock for `holdMs`. True when this process may run the job. */
async function acquire(name: string, holdMs: number): Promise<boolean> {
  const now = new Date();
  const until = new Date(now.getTime() + holdMs);
  await prisma.jobLock.upsert({ where: { name }, create: { name, lockedUntil: new Date(0) }, update: {} });
  const res = await prisma.jobLock.updateMany({ where: { name, lockedUntil: { lt: now } }, data: { lockedUntil: until } });
  return res.count === 1;
}

/** Run one job now (if no other process holds it). Returns its summary, or null if skipped. */
export async function runJob(job: JobDef): Promise<string | null> {
  if (!(await acquire(job.name, 30 * 60_000))) return null;
  let result: string;
  try {
    result = await job.run();
  } catch (e) {
    result = `error: ${e instanceof Error ? e.message.slice(0, 200) : 'unknown'}`;
    console.warn(`[jobs] ${job.name} failed:`, e instanceof Error ? e.message : e);
  }
  // Keep the lock until the next due time so other processes skip this slot.
  await prisma.jobLock.update({
    where: { name: job.name },
    data: { lastRunAt: new Date(), lastResult: result, lockedUntil: new Date(Date.now() + job.everyMs - 60_000) },
  });
  return result;
}

/** Start all registered jobs: first run shortly after boot, then on their interval. */
export function startJobs(): void {
  if (process.env.DISABLE_JOBS === 'true') return;
  for (const job of jobs) {
    const tick = () => void runJob(job).catch((e) => console.warn(`[jobs] ${job.name}:`, e?.message ?? e));
    setTimeout(tick, 15_000).unref();
    setInterval(tick, job.everyMs).unref();
  }
}
