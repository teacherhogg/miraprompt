import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import {
  listJobs,
  readJob,
  writeJob,
  deleteJob,
  toSlug,
  normalizeJob,
} from '../jobs.js';
import {
  defaultExecutionConfig,
  validateExecutionConfig,
  getModelById,
} from '../models.js';
import { transformPromptForFal } from '../prompt-transform.js';
import { generateWithFal } from '../providers/fal-ai.js';
import { getDataDir } from '../paths.js';

const DATA_DIR = getDataDir();
const GENERATED_DIR = path.join(DATA_DIR, 'generated');

const router = Router();
const runControllers = new Map();

function stringifySafe(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function extractFalError(err) {
  const status = err?.fal?.status || err?.status || err?.response?.status || null;
  const raw = err?.fal?.raw || err?.response?.data || err?.data || null;
  const rawText = raw == null ? '' : stringifySafe(raw);
  const details = rawText.length > 500 ? `${rawText.slice(0, 500)}...` : rawText;

  const parts = [];
  if (err?.message) parts.push(err.message);
  if (status) parts.push(`status=${status}`);
  if (details) parts.push(`details=${details}`);

  return {
    status,
    details,
    message: parts.join(' | ') || 'Unknown fal.ai error',
  };
}

function hasSuccessfulImages(job) {
  return (job?.prompts || []).some(
    (p) => p?.generation?.status === 'completed' && (p?.generation?.imageUrl || p?.generation?.localFilePath)
  );
}

function toPublicImagePath(localFilePath) {
  if (!localFilePath) return null;
  return `/${String(localFilePath).replace(/\\/g, '/')}`;
}

function resetPromptForClone(prompt) {
  return {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    category: prompt.category ?? null,
    subcategory: prompt.subcategory ?? null,
    description: prompt.description ?? '',
    styles: prompt.styles ?? {},
    transformedPrompt: null,
    generation: {
      status: 'not-started',
      requestId: null,
      imageUrl: null,
      localFilePath: null,
      metadata: null,
      error: null,
      startedAt: null,
      completedAt: null,
    },
  };
}

async function ensureGeneratedDir() {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
}

function contentTypeToExt(contentType) {
  const value = String(contentType || '').toLowerCase();
  if (value.includes('png')) return 'png';
  if (value.includes('webp')) return 'webp';
  if (value.includes('jpeg') || value.includes('jpg')) return 'jpg';
  return 'jpg';
}

async function downloadImageToLocal(jobSlug, promptId, imageUrl) {
  if (!imageUrl) return null;

  await ensureGeneratedDir();
  const jobDir = path.join(GENERATED_DIR, jobSlug);
  await fs.mkdir(jobDir, { recursive: true });

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status})`);
  }

  const ext = contentTypeToExt(response.headers.get('content-type'));
  const fileName = `${promptId}-${Date.now()}.${ext}`;
  const absPath = path.join(jobDir, fileName);
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(absPath, bytes);

  // Store workspace-relative path for portability.
  return path.join('data', 'generated', jobSlug, fileName);
}

async function runJobGeneration(slug) {
  const controller = { stopRequested: false };
  runControllers.set(slug, controller);

  try {
    let job = normalizeJob(await readJob(slug));
    job.status = 'in-progress';
    job.lastRunAt = new Date().toISOString();
    await writeJob(slug, job);

    const modelInfo = getModelById(job.execution.model);
    if (!modelInfo) {
      throw new Error('Configured model is not supported');
    }

    for (let i = 0; i < job.prompts.length; i += 1) {
      if (controller.stopRequested) break;

      const prompt = job.prompts[i];
      const transformedPrompt = transformPromptForFal(prompt, job.execution);
      prompt.transformedPrompt = transformedPrompt;
      prompt.generation = {
        status: 'in-progress',
        requestId: null,
        imageUrl: null,
        localFilePath: null,
        metadata: null,
        error: null,
        startedAt: new Date().toISOString(),
        completedAt: null,
      };
      await writeJob(slug, job);

      try {
        const result = await generateWithFal({
          falModelId: modelInfo.falModelId,
          transformedPrompt,
          settings: job.execution.settings,
        });

        const firstImageUrl = result.imageUrls[0] || null;
        let localFilePath = null;
        if (firstImageUrl) {
          localFilePath = await downloadImageToLocal(job.slug, prompt.id, firstImageUrl);
        }

        prompt.generation = {
          ...prompt.generation,
          status: 'completed',
          requestId: result.requestId || null,
          imageUrl: firstImageUrl,
          localFilePath,
          metadata: result.rawData || null,
          error: null,
          completedAt: new Date().toISOString(),
        };
      } catch (err) {
        const falError = extractFalError(err);
        prompt.generation = {
          ...prompt.generation,
          status: 'failed',
          error: falError.message,
          metadata: {
            error: {
              status: falError.status,
              details: falError.details,
            },
          },
          completedAt: new Date().toISOString(),
        };
      }

      await writeJob(slug, job);
    }

    job = normalizeJob(await readJob(slug));
    job.status = 'idle';
    job.lastRunAt = new Date().toISOString();
    await writeJob(slug, job);
  } catch (err) {
    const job = normalizeJob(await readJob(slug));
    job.status = 'idle';
    job.lastRunAt = new Date().toISOString();
    await writeJob(slug, job);
    console.error(`Phase 3 run failed for ${slug}:`, err);
  } finally {
    runControllers.delete(slug);
  }
}

// GET /api/jobs
router.get('/', async (_req, res) => {
  try {
    const jobs = await listJobs();
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/generated-images?subcategory=Watercolor
router.get('/generated-images', async (req, res) => {
  try {
    const subcategory = String(req.query?.subcategory || '').trim().toLowerCase();
    const summaries = await listJobs();
    const images = [];

    for (const summary of summaries) {
      const job = await readJob(summary.slug);
      for (const prompt of job.prompts || []) {
        if (!prompt?.generation?.imageUrl && !prompt?.generation?.localFilePath) continue;
        if (subcategory && String(prompt.subcategory || '').toLowerCase() !== subcategory) continue;
        images.push({
          jobName: job.name,
          jobSlug: job.slug,
          promptId: prompt.id,
          subcategory: prompt.subcategory || null,
          category: prompt.category || null,
          description: prompt.description || null,
          transformedPrompt: prompt.transformedPrompt || null,
          styles: prompt.styles || {},
          imageUrl: prompt.generation?.imageUrl || null,
          localFilePath: prompt.generation?.localFilePath || null,
          publicLocalPath: toPublicImagePath(prompt.generation?.localFilePath),
          createdAt: prompt.generation?.completedAt || prompt.createdAt,
        });
      }
    }

    images.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json({ images });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:slug
router.get('/:slug', async (req, res) => {
  try {
    const job = await readJob(req.params.slug);
    res.json(job);
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Job not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs  — body: { name }
router.post('/', async (req, res) => {
  try {
    const { name, cloneFromSlug } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const slug = toSlug(String(name).trim());
    if (!slug) {
      return res.status(400).json({ error: 'name produces an empty slug' });
    }

    try {
      await readJob(slug);
      return res.status(409).json({ error: `A job with slug "${slug}" already exists` });
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }

    let prompts = [];
    let execution = defaultExecutionConfig();

    if (cloneFromSlug) {
      const sourceJob = await readJob(String(cloneFromSlug));
      prompts = (sourceJob.prompts || []).map((prompt) => resetPromptForClone(prompt));
      execution = sourceJob.execution || defaultExecutionConfig();
    }

    const job = {
      name: String(name).trim(),
      slug,
      createdAt: new Date().toISOString(),
      status: 'never',
      lastRunAt: null,
      execution,
      prompts,
    };
    await writeJob(slug, job);
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:slug/prompts
router.post('/:slug/prompts', async (req, res) => {
  try {
    const job = await readJob(req.params.slug);
    const prompt = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      category: req.body.category ?? null,
      subcategory: req.body.subcategory ?? null,
      description: req.body.description ?? '',
      styles: req.body.styles ?? {},
      transformedPrompt: null,
      generation: {
        status: 'not-started',
        requestId: null,
        imageUrl: null,
        localFilePath: null,
        metadata: null,
        error: null,
        startedAt: null,
        completedAt: null,
      },
    };
    job.prompts.push(prompt);
    await writeJob(job.slug, job);
    res.status(201).json(prompt);
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Job not found' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/jobs/:slug/execution
router.patch('/:slug/execution', async (req, res) => {
  try {
    const job = await readJob(req.params.slug);
    const nextExecution = {
      ...defaultExecutionConfig(),
      ...(job.execution || {}),
      ...(req.body || {}),
      settings: {
        ...defaultExecutionConfig().settings,
        ...(job.execution?.settings || {}),
        ...(req.body?.settings || {}),
      },
    };

    const validation = validateExecutionConfig(nextExecution);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    job.execution = nextExecution;
    await writeJob(job.slug, job);
    res.json({ execution: job.execution });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Job not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:slug/start
router.post('/:slug/start', async (req, res) => {
  try {
    const job = await readJob(req.params.slug);
    if (job.status === 'in-progress') {
      return res.status(409).json({ error: 'Job already in progress' });
    }

    const hasSuccessfulRun = hasSuccessfulImages(job);
    if (hasSuccessfulRun) {
      return res.status(409).json({
        error: 'This job already has successful generated images. Duplicate it from Create New Job to preserve history before running again.',
      });
    }

    if (!job.prompts.length) {
      return res.status(400).json({ error: 'Job has no prompts to run' });
    }

    const validation = validateExecutionConfig(job.execution);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    runJobGeneration(job.slug);
    res.status(202).json({ accepted: true, status: 'in-progress' });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Job not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:slug/stop
router.post('/:slug/stop', async (req, res) => {
  try {
    const controller = runControllers.get(req.params.slug);
    if (controller) {
      controller.stopRequested = true;
    }
    res.json({ accepted: true, stopRequested: Boolean(controller) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:slug/progress
router.get('/:slug/progress', async (req, res) => {
  try {
    const job = await readJob(req.params.slug);
    const total = job.prompts.length;
    const completed = job.prompts.filter((p) => p.generation?.status === 'completed').length;
    const failed = job.prompts.filter((p) => p.generation?.status === 'failed').length;
    const running = job.prompts.filter((p) => p.generation?.status === 'in-progress').length;
    res.json({
      status: job.status,
      total,
      completed,
      failed,
      running,
    });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Job not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:slug
router.delete('/:slug', async (req, res) => {
  try {
    await deleteJob(req.params.slug);
    res.status(204).end();
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Job not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:slug/prompts/:promptId
router.delete('/:slug/prompts/:promptId', async (req, res) => {
  try {
    const job = await readJob(req.params.slug);
    const before = job.prompts.length;
    job.prompts = job.prompts.filter((p) => p.id !== req.params.promptId);
    if (job.prompts.length === before) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    await writeJob(job.slug, job);
    res.status(204).end();
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Job not found' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/jobs/:slug/status (legacy Phase 2 endpoint)
router.patch('/:slug/status', async (req, res) => {
  try {
    const job = await readJob(req.params.slug);
    const status = String(req.body?.status || '').trim();
    if (!['never', 'in-progress', 'idle'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    job.status = status;
    if (status === 'in-progress' || status === 'idle') {
      job.lastRunAt = new Date().toISOString();
    }

    await writeJob(job.slug, job);
    res.json({ status: job.status, lastRunAt: job.lastRunAt });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Job not found' });
    res.status(500).json({ error: err.message });
  }
});

export default router;
