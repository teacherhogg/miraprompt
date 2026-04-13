export const MODEL_CATALOG = [
  {
    id: 'nano-banana-2',
    provider: 'fal-ai',
    falModelId: 'fal-ai/nano-banana-2',
    settings: {
      aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      resolutions: ['1024x1024', '1280x720', '720x1280'],
    },
    specificOptions: [],
  },
  {
    id: 'nano-banana',
    provider: 'fal-ai',
    falModelId: 'fal-ai/nano-banana',
    settings: {
      aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      resolutions: ['1024x1024', '1280x720', '720x1280'],
    },
    specificOptions: [],
  },
  {
    id: 'flux/schnell',
    provider: 'fal-ai',
    falModelId: 'fal-ai/flux/schnell',
    settings: {
      aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      resolutions: ['1024x1024', '1280x720', '720x1280'],
    },
    specificOptions: [
      {
        key: 'strength',
        label: 'Strength',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.01,
        default: 0.8,
      },
      {
        key: 'input_url',
        label: 'Input Image (Base64)',
        type: 'text',
        default: '',
      },
    ],
  },
  {
    id: 'flux/dev',
    provider: 'fal-ai',
    falModelId: 'fal-ai/flux/dev',
    settings: {
      aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      resolutions: ['1024x1024', '1280x720', '720x1280'],
    },
    specificOptions: [
      {
        key: 'strength',
        label: 'Strength',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.01,
        default: 0.8,
      },
      {
        key: 'input_url',
        label: 'Input Image (Base64)',
        type: 'text',
        default: '',
      },
    ],
  },
  {
    id: 'ideogram/v3',
    provider: 'fal-ai',
    falModelId: 'fal-ai/ideogram/v3',
    settings: {
      aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      resolutions: ['1024x1024', '1365x1024', '1024x1365'],
    },
    specificOptions: [
      {
        key: 'rendering_speed',
        label: 'Rendering Speed',
        type: 'select',
        options: ['TURBO', 'BALANCED', 'QUALITY'],
        default: 'TURBO',
      },
    ],
  },
  {
    id: 'ideogram/v2',
    provider: 'fal-ai',
    falModelId: 'fal-ai/ideogram/v2',
    settings: {
      aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      resolutions: ['1024x1024', '1280x720', '720x1280'],
    },
    specificOptions: [],
  },
];

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

  return { ok: true, model };
}
