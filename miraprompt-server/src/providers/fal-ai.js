import { fal } from '@fal-ai/client';

function extractImageUrls(data) {
  if (!data || typeof data !== 'object') return [];

  if (Array.isArray(data.images)) {
    return data.images.map((item) => item?.url || item).filter(Boolean);
  }

  if (data.image?.url) return [data.image.url];
  if (typeof data.image === 'string') return [data.image];

  if (data.output?.images && Array.isArray(data.output.images)) {
    return data.output.images.map((item) => item?.url || item).filter(Boolean);
  }

  return [];
}

export async function generateWithFal({ falModelId, transformedPrompt, settings }) {
  if (!process.env.FAL_KEY) {
    throw new Error('FAL_KEY is not configured on the server');
  }

  fal.config({ credentials: process.env.FAL_KEY });

  const [w, h] = String(settings.resolution || '1024x1024')
    .split('x')
    .map((v) => Number(v));

  const input = {
    prompt: transformedPrompt,
    image_size: settings.aspectRatio,
    width: Number.isFinite(w) ? w : undefined,
    height: Number.isFinite(h) ? h : undefined,
    negative_prompt: settings.negativePrompt || undefined,
    seed: Number.isInteger(Number(settings.seed)) ? Number(settings.seed) : undefined,
    strength: Number.isFinite(Number(settings.strength)) ? Number(settings.strength) : undefined,
    input_url: settings.input_url || undefined,
    reference_image_url: settings.reference_image_url || undefined,
    id_scale: Number.isFinite(Number(settings.id_scale)) ? Number(settings.id_scale) : undefined,
    ...(settings.rendering_speed ? { rendering_speed: settings.rendering_speed } : {}),
  };

  let result;
  try {
    result = await fal.subscribe(falModelId, {
      input,
      logs: true,
    });
  } catch (err) {
    const status = err?.status || err?.response?.status || err?.data?.statusCode || null;
    const raw = err?.body || err?.response?.data || err?.data || null;
    const wrapped = new Error(err?.message || 'fal.ai request failed');
    wrapped.fal = { status, raw };
    throw wrapped;
  }

  return {
    requestId: result.requestId,
    rawData: result.data,
    imageUrls: extractImageUrls(result.data),
  };
}
