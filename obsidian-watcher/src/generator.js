import path from 'path';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 300_000;

async function apiFetch(serverUrl, pathname, method = 'GET', body) {
  const res = await fetch(`${serverUrl}${pathname}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${method} ${pathname}: ${text}`);
  }
  return res.json();
}

async function pollProgress(serverUrl, slug) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    let progress;
    try {
      progress = await apiFetch(serverUrl, `/api/jobs/${slug}/progress`);
    } catch (err) {
      // 500 during polling is a transient read error (e.g. JSON file mid-write); retry
      if (err.message.includes('HTTP 5')) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }
      throw err;
    }
    if (progress.running === 0 && progress.completed + progress.failed === progress.total) {
      return progress;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Job ${slug} did not complete within ${POLL_TIMEOUT_MS / 1000}s`);
}

async function getModelSettings(serverUrl, modelId) {
  const data = await apiFetch(serverUrl, '/api/models');
  const model = (data.models || []).find((m) => m.id === modelId);
  return {
    aspectRatio: model?.settings?.aspectRatios?.[0] ?? '1:1',
    resolution: model?.settings?.resolutions?.[0] ?? '1024x1024',
  };
}

export async function generateImage(analysis, config) {
  const { serverUrl, miraDatDir, defaultModelId } = config;
  const { imagePrompt, selectedStylePrompts, modelId, jobName } = analysis;

  const effectiveModelId = modelId || defaultModelId;
  const { aspectRatio, resolution } = await getModelSettings(serverUrl, effectiveModelId);

  const uniqueName = `${jobName}-${Math.random().toString(36).slice(2, 6)}`;
  const job = await apiFetch(serverUrl, '/api/jobs', 'POST', { name: uniqueName });
  const slug = job.slug;

  await apiFetch(serverUrl, `/api/jobs/${slug}/execution`, 'PATCH', {
    model: effectiveModelId,
    settings: { aspectRatio, resolution },
  });

  const styles = {
    'saved-styles': (selectedStylePrompts || []).map((p) => ({ prompt: p })),
  };
  await apiFetch(serverUrl, `/api/jobs/${slug}/prompts`, 'POST', {
    description: imagePrompt,
    styles,
  });

  await apiFetch(serverUrl, `/api/jobs/${slug}/start`, 'POST');

  await pollProgress(serverUrl, slug);

  const jobData = await apiFetch(serverUrl, `/api/jobs/${slug}`);
  const generation = jobData.prompts?.[0]?.generation;
  if (generation?.status === 'failed') {
    throw new Error(`Image generation failed for job ${slug}: ${generation.error || 'unknown error'}`);
  }
  const localFilePath = generation?.localFilePath;
  if (!localFilePath) throw new Error(`No localFilePath found for job ${slug} (status: ${generation?.status})`);

  // localFilePath is relative to the server's app root: "data/generated/..."
  // Strip the leading "data/" prefix and join with the bind-mounted data dir.
  const relative = localFilePath.replace(/^data[\\/]/, '');
  return path.join(miraDatDir, relative);
}
