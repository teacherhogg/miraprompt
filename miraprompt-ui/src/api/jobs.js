export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3011';

export function resolveApiAssetUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  const value = String(pathOrUrl);
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }
  return new URL(value, `${API_BASE}/`).toString();
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message = isJson
      ? data.error || `HTTP ${res.status}`
      : `HTTP ${res.status}: ${String(data).replace(/\s+/g, ' ').slice(0, 220)}`;
    throw new Error(message);
  }
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

export function updatePrompt(slug, promptId, patch) {
  return request('PATCH', `/api/jobs/${slug}/prompts/${promptId}`, patch).then((d) => d.prompt);
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

export function listSavedStyles() {
  return request('GET', '/api/saved-styles');
}

export function createSavedStyle(payload) {
  return request('POST', '/api/saved-styles', payload);
}

export function updateSavedStyle(payload) {
  return request('PATCH', '/api/saved-styles', payload);
}

export function deleteSavedStyle(payload) {
  return request('DELETE', '/api/saved-styles', payload);
}
