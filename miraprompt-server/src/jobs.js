import { promises as fs } from 'fs';
import path from 'path';
import { defaultExecutionConfig } from './models.js';
import { getDataDir } from './paths.js';

const DATA_DIR = getDataDir();
const JOBS_DIR = path.join(DATA_DIR, 'jobs');

export async function ensureJobsDir() {
  await fs.mkdir(JOBS_DIR, { recursive: true });
}

export function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function listJobs() {
  await ensureJobsDir();
  const files = await fs.readdir(JOBS_DIR);
  const jobs = [];
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    try {
      const raw = await fs.readFile(path.join(JOBS_DIR, file), 'utf8');
      const job = normalizeJob(JSON.parse(raw));
      jobs.push({
        name: job.name,
        slug: job.slug,
        createdAt: job.createdAt,
        promptCount: job.prompts.length,
        status: job.status || 'never',
        lastRunAt: job.lastRunAt || null,
        execution: job.execution,
      });
    } catch {
      // skip malformed files
    }
  }
  return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readJob(slug) {
  const filePath = path.join(JOBS_DIR, `${slug}.json`);
  const raw = await fs.readFile(filePath, 'utf8');
  return normalizeJob(JSON.parse(raw));
}

export async function writeJob(slug, data) {
  await ensureJobsDir();
  const filePath = path.join(JOBS_DIR, `${slug}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function deleteJob(slug) {
  const filePath = path.join(JOBS_DIR, `${slug}.json`);
  await fs.unlink(filePath);
}

export function normalizeJob(job) {
  const execution = {
    ...defaultExecutionConfig(),
    ...(job.execution || {}),
    settings: {
      ...defaultExecutionConfig().settings,
      ...(job.execution?.settings || {}),
    },
  };

  const prompts = (job.prompts || []).map((prompt) => ({
    ...prompt,
    transformedPrompt: prompt.transformedPrompt || null,
    generation: {
      status: prompt.generation?.status || 'not-started',
      requestId: prompt.generation?.requestId || null,
      imageUrl: prompt.generation?.imageUrl || null,
      localFilePath: prompt.generation?.localFilePath || null,
      metadata: prompt.generation?.metadata || null,
      error: prompt.generation?.error || null,
      startedAt: prompt.generation?.startedAt || null,
      completedAt: prompt.generation?.completedAt || null,
    },
  }));

  return {
    ...job,
    status: job.status || 'never',
    lastRunAt: Object.prototype.hasOwnProperty.call(job, 'lastRunAt') ? job.lastRunAt : null,
    execution,
    prompts,
  };
}
