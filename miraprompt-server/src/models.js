import modelSettings from './assets/model-settings.json' with { type: 'json' };
export const MODEL_CATALOG = modelSettings;

export function getModelById(modelId) {
  return MODEL_CATALOG.find((m) => m.id === modelId) || null;
}

export function defaultExecutionConfig() {
  return {
    provider: 'fal-ai',
    model: 'nano-banana-2',
    settings: {
      aspectRatio: '1:1',
      resolution: '1024x1024',
      negativePrompt: '',
      seed: null,
      characterChaining: false,
      characterStrength: 0.4,
      characterIdScale: 0.8,
      characterReferenceUrl: '',
    },
  };
}

export function validateExecutionConfig(config) {
  if (!config || typeof config !== 'object') {
    return { ok: false, error: 'execution config is required' };
  }
  if (config.provider !== 'fal-ai') {
    return { ok: false, error: 'Only fal-ai is supported in Phase 3' };
  }

  const model = getModelById(config.model);
  if (!model) {
    return { ok: false, error: 'Unsupported model' };
  }

  const aspectRatio = config.settings?.aspectRatio;
  const resolution = config.settings?.resolution;
  const seed = config.settings?.seed;

  if (!model.settings.aspectRatios.includes(aspectRatio)) {
    return { ok: false, error: 'Unsupported aspect ratio for selected model' };
  }
  if (!model.settings.resolutions.includes(resolution)) {
    return { ok: false, error: 'Unsupported resolution for selected model' };
  }

  if (seed !== null && seed !== undefined && seed !== '') {
    const seedNumber = Number(seed);
    if (!Number.isInteger(seedNumber) || seedNumber < 0) {
      return { ok: false, error: 'seed must be a non-negative integer when provided' };
    }
  }

  const strength = config.settings?.strength;
  if (strength !== null && strength !== undefined && strength !== '') {
    const strengthNumber = Number(strength);
    if (!Number.isFinite(strengthNumber) || strengthNumber < 0 || strengthNumber > 1) {
      return { ok: false, error: 'strength must be between 0 and 1' };
    }
  }

  const characterStrength = config.settings?.characterStrength;
  if (characterStrength !== null && characterStrength !== undefined && characterStrength !== '') {
    const characterStrengthNumber = Number(characterStrength);
    if (!Number.isFinite(characterStrengthNumber) || characterStrengthNumber < 0 || characterStrengthNumber > 1) {
      return { ok: false, error: 'characterStrength must be between 0 and 1' };
    }
  }

  const characterIdScale = config.settings?.characterIdScale;
  if (characterIdScale !== null && characterIdScale !== undefined && characterIdScale !== '') {
    const characterIdScaleNumber = Number(characterIdScale);
    if (!Number.isFinite(characterIdScaleNumber) || characterIdScaleNumber < 0 || characterIdScaleNumber > 1) {
      return { ok: false, error: 'characterIdScale must be between 0 and 1' };
    }
  }

  const idScale = config.settings?.id_scale;
  if (idScale !== null && idScale !== undefined && idScale !== '') {
    const idScaleNumber = Number(idScale);
    if (!Number.isFinite(idScaleNumber) || idScaleNumber < 0 || idScaleNumber > 1) {
      return { ok: false, error: 'id_scale must be between 0 and 1' };
    }
  }

  return { ok: true, model };
}
