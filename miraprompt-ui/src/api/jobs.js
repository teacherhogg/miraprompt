const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3011';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function listJobs() {
  return request('GET', '/api/jobs').then((d) => d.jobs);
}

export function getJob(slug) {
  return request('GET', `/api/jobs/${slug}`);
}

export function createJob(name, cloneFromSlug = null) {
  return request('POST', '/api/jobs', { name, cloneFromSlug });
}

export function addPrompt(slug, promptPayload) {
  return request('POST', `/api/jobs/${slug}/prompts`, promptPayload);
}

export function deleteJob(slug) {
  return request('DELETE', `/api/jobs/${slug}`);
}

export function deletePrompt(slug, promptId) {
  return request('DELETE', `/api/jobs/${slug}/prompts/${promptId}`);
}

export function setJobStatus(slug, status) {
  return request('PATCH', `/api/jobs/${slug}/status`, { status });
}

export function listModels() {
  return request('GET', '/api/models');
}

export function updateJobExecution(slug, execution) {
  return request('PATCH', `/api/jobs/${slug}/execution`, execution);
}

export function startJobRun(slug) {
  return request('POST', `/api/jobs/${slug}/start`);
}

export function stopJobRun(slug) {
  return request('POST', `/api/jobs/${slug}/stop`);
}

export function getJobProgress(slug) {
  return request('GET', `/api/jobs/${slug}/progress`);
}

export function listGeneratedImages(subcategory = null) {
  const suffix = subcategory
    ? `?subcategory=${encodeURIComponent(subcategory)}`
    : '';
  return request('GET', `/api/jobs/generated-images${suffix}`).then((d) => d.images);
}
