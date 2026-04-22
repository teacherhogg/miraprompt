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
    id: 'nano-banana-2/edit',
    provider: 'fal-ai',
    falModelId: 'fal-ai/nano-banana-2/edit',
    settings: {
      aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      resolutions: ['1024x1024', '1280x720', '720x1280'],
    },
    specificOptions: [
      {
        key: 'input_url',
        label: 'Input Image (Base64)',
        type: 'text',
        default: '',
        multiple: true,
      },
      {
        key: 'strength',
        label: 'Strength',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.01,
        default: 0.8,
      }
    ],
  },
  {
    id: 'openai/gpt-image-2',
    provider: 'openai',
    falModelId: 'openai/gpt-image-2',
    settings: {
      aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      resolutions: ['1024x1024', '1280x720', '720x1280'],
    },
    specificOptions: [],
  },
  {
    id: 'openai/gpt-image-2/edit',
    provider: 'openai',
    falModelId: 'openai/gpt-image-2/edit',
    settings: {
      aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      resolutions: ['1024x1024', '1280x720', '720x1280'],
    },
    specificOptions: [
      {
        key: 'input_url',
        label: 'Input Image (Base64)',
        type: 'text',
        default: '',
        multiple: true,
      },
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
        key: 'quality',
        label: 'Quality',
        type: 'select',
        options: ['high', 'medium', 'low'],
        default: 'medium',
      }
    ],
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
    id: 'xai/grok-imagine-image',
    provider: 'fal-ai',
    falModelId: 'fal-ai/xai/grok-imagine-image',
    settings: {
      aspectRatios: ['2:1', '20:9', '19.5:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:19.5', '9:20', '1:2'],
      resolutions: ['1024x1024', '1365x1024', '1024x1365'],
    },
    specificOptions: [],
  },
  {
    id: 'flux/schnell',
    provider: 'fal-ai',
    falModelId: 'fal-ai/flux/schnell',
    settings: {
      aspectRatios: ['square_hd', 'square', 'portrait_4_3', 'landscape_4_3', 'landscape_16_9'],
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
      aspectRatios: ['square_hd', 'square', 'portrait_4_3', 'landscape_4_3', 'landscape_16_9'],
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
    id: 'flux/pulid',
    provider: 'fal-ai',
    falModelId: 'fal-ai/flux-pulid',
    settings: {
      aspectRatios: ['square_hd', 'square', 'portrait_4_3', 'landscape_4_3', 'landscape_16_9'],
      resolutions: ['1024x1024', '1280x720', '720x1280'],
    },
    specificOptions: [
      {
        key: 'id_scale',
        label: 'Identity Scale',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.01,
        default: 0.8,
      },
      {
        key: 'reference_image_url',
        label: 'Reference Image (URL/Base64)',
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
      // Ideogram v3 expects named image_size enums instead of generic ratios.
      aspectRatios: ['square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
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
