<template>
  <div>
    <q-card flat bordered>
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">Models</div>
        <q-btn flat dense round icon="refresh" :loading="loading" @click="loadAll">
          <q-tooltip>Refresh models and jobs</q-tooltip>
        </q-btn>
      </q-card-section>
      <q-separator />

      <q-card-section>
        <div v-if="error" class="text-negative q-mb-md">{{ error }}</div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-select
              v-model="selectedJobSlug"
              :options="jobOptions"
              label="Job"
              outlined
              emit-value
              map-options
              :disable="!jobs.length"
            >
              <template #append>
                <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                  <q-tooltip class="model-help-tooltip bg-primary text-white">
                    Pick the job whose model settings you want to edit.
                  </q-tooltip>
                </q-icon>
              </template>
            </q-select>
          </div>
          <div class="col-12 col-md-6">
            <q-select
              v-model="execution.model"
              :options="modelOptions"
              label="Model"
              outlined
              emit-value
              map-options
              :disable="!selectedJobSlug || !modelOptions.length"
            >
              <template #append>
                <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                  <q-tooltip class="model-help-tooltip bg-primary text-white">
                    Select the generation model for this job.
                  </q-tooltip>
                </q-icon>
              </template>
            </q-select>
          </div>
          <div class="col-12 col-md-6">
            <q-select
              v-model="execution.settings.aspectRatio"
              :options="aspectRatioOptions"
              label="Aspect ratio"
              outlined
              emit-value
              map-options
              :disable="!selectedJobSlug"
            >
              <template #append>
                <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                  <q-tooltip class="model-help-tooltip bg-primary text-white">
                    Controls the shape of the generated image (for example 1:1 or 16:9).
                  </q-tooltip>
                </q-icon>
              </template>
            </q-select>
          </div>
          <div class="col-12 col-md-6">
            <q-select
              v-model="execution.settings.resolution"
              :options="resolutionOptions"
              label="Resolution"
              outlined
              emit-value
              map-options
              :disable="!selectedJobSlug"
            >
              <template #append>
                <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                  <q-tooltip class="model-help-tooltip bg-primary text-white">
                    Sets output pixel size. Higher values may increase quality and time.
                  </q-tooltip>
                </q-icon>
              </template>
            </q-select>
          </div>
          <div class="col-12 col-md-6">
            <q-input
              v-model.number="execution.settings.seed"
              type="number"
              min="0"
              label="Seed (optional)"
              outlined
              :disable="!selectedJobSlug"
              hint="Leave empty for random"
            >
              <template #append>
                <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                  <q-tooltip class="model-help-tooltip bg-primary text-white">
                    Use a fixed seed to reproduce similar outputs. Leave blank for randomness.
                  </q-tooltip>
                </q-icon>
              </template>
            </q-input>
          </div>
          <!-- model-specific options (e.g. rendering_speed for ideogram/v3) -->
          <template v-if="selectedModel?.specificOptions?.length">
            <div
              v-for="opt in selectedModel.specificOptions"
              :key="opt.key"
              class="col-12 col-md-6"
            >
              <q-select
                v-if="opt.type === 'select'"
                v-model="execution.settings[opt.key]"
                :options="opt.options"
                :label="opt.label"
                outlined
                emit-value
                map-options
                :disable="!selectedJobSlug"
              >
                <template #append>
                  <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                    <q-tooltip class="model-help-tooltip bg-primary text-white">
                      {{ specificOptionHelp(opt.key) }}
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-select>
              <q-input
                v-else-if="opt.type === 'number'"
                v-model.number="execution.settings[opt.key]"
                type="number"
                :min="opt.min"
                :max="opt.max"
                :step="opt.step || 0.01"
                :label="opt.label"
                outlined
                :disable="!selectedJobSlug"
              >
                <template #append>
                  <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                    <q-tooltip class="model-help-tooltip bg-primary text-white">
                      {{ specificOptionHelp(opt.key) }}
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>
              <q-input
                v-else-if="opt.type === 'text'"
                v-model="execution.settings[opt.key]"
                type="textarea"
                autogrow
                :label="opt.label"
                outlined
                :disable="!selectedJobSlug"
              >
                <template #append>
                  <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                    <q-tooltip class="model-help-tooltip bg-primary text-white">
                      {{ specificOptionHelp(opt.key) }}
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>
            </div>
          </template>

          <div v-if="isFluxModel" class="col-12">
            <q-select
              v-model="selectedInputImage"
              :options="generatedImageOptions"
              label="Choose Input Image from Previous Generations"
              outlined
              emit-value
              map-options
              clearable
              :disable="!selectedJobSlug || !generatedImageOptions.length"
              @update:model-value="chooseInputImage"
              hint="Selected image is converted to base64 and stored in input_url"
            >
              <template #append>
                <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                  <q-tooltip class="model-help-tooltip bg-primary text-white">
                    Pick any previously generated image. It will be converted to base64 and saved to input_url.
                  </q-tooltip>
                </q-icon>
              </template>
            </q-select>
          </div>

          <div class="col-12">
            <q-toggle
              v-model="execution.settings.characterChaining"
              color="primary"
              label="Enable Character Chain"
              :disable="!selectedJobSlug || (!isChainCompatibleModel && !execution.settings.characterChaining)"
            >
              <template #append>
                <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                  <q-tooltip class="model-help-tooltip bg-primary text-white">
                    Prompt 1 becomes the anchor subject. Later prompts reuse it for visual consistency.
                  </q-tooltip>
                </q-icon>
              </template>
            </q-toggle>
          </div>

          <div class="col-12" v-if="!isChainCompatibleModel">
            <q-banner rounded class="bg-amber-1 text-amber-10">
              Character Chain is disabled for this model. Switch to flux/dev, flux/schnell, or flux/pulid.
            </q-banner>
          </div>

          <template v-if="execution.settings.characterChaining">
            <div class="col-12 col-md-6">
              <q-select
                v-model="selectedCharacterRefImage"
                :options="generatedImageOptions"
                label="Character Reference from Existing Images (optional)"
                outlined
                emit-value
                map-options
                clearable
                :disable="!selectedJobSlug || !generatedImageOptions.length"
                @update:model-value="chooseCharacterReferenceImage"
                hint="If empty, Prompt 1 output becomes the anchor."
              >
                <template #append>
                  <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                    <q-tooltip class="model-help-tooltip bg-primary text-white">
                      Pick a prior image to lock character appearance from the start.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-select>
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="execution.settings.characterReferenceUrl"
                type="textarea"
                autogrow
                label="Character Reference URL/Base64 (optional)"
                outlined
                :disable="!selectedJobSlug"
              >
                <template #append>
                  <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                    <q-tooltip class="model-help-tooltip bg-primary text-white">
                      Optional direct reference. Leave blank to use Prompt 1 output automatically.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>
            </div>

            <div class="col-12" v-if="characterReferencePreviewUrl">
              <q-card flat bordered class="bg-grey-1">
                <q-card-section class="q-pb-sm">
                  <div class="text-subtitle2">Character Reference Preview</div>
                  <div class="text-caption text-grey-7">
                    This is the image that will be used as the reference anchor.
                  </div>
                </q-card-section>
                <q-separator />
                <q-card-section>
                  <q-img
                    :src="characterReferencePreviewUrl"
                    fit="contain"
                    style="max-width:220px; max-height:220px"
                    class="rounded-borders"
                  />
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-6" v-if="isFluxModel">
              <q-input
                v-model.number="execution.settings.characterStrength"
                type="number"
                min="0"
                max="1"
                step="0.01"
                label="Character Chain Strength"
                outlined
                :disable="!selectedJobSlug"
                hint="Recommended 0.30 - 0.50"
              >
                <template #append>
                  <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                    <q-tooltip class="model-help-tooltip bg-primary text-white">
                      Lower values allow bigger scene/pose changes while keeping the same subject.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>
            </div>

            <div class="col-12 col-md-6" v-if="isPulidModel">
              <q-input
                v-model.number="execution.settings.characterIdScale"
                type="number"
                min="0"
                max="1"
                step="0.01"
                label="Character Identity Scale"
                outlined
                :disable="!selectedJobSlug"
                hint="Higher values preserve face identity more strongly"
              >
                <template #append>
                  <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                    <q-tooltip class="model-help-tooltip bg-primary text-white">
                      Controls how strongly the model keeps facial identity across prompts.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>
            </div>

            <div class="col-12" v-if="!isFluxModel && !isPulidModel">
              <q-banner rounded class="bg-amber-1 text-amber-10">
                Character Chain works with FLUX models. Choose flux/dev, flux/schnell, or flux/pulid.
              </q-banner>
            </div>
            <div class="col-12" v-if="isPulidModel && !hasCharacterReference">
              <q-banner rounded class="bg-amber-1 text-amber-10">
                flux/pulid requires a Character Reference image when Character Chain is enabled.
              </q-banner>
            </div>
          </template>

          <div class="col-12">
            <q-input
              v-model="execution.settings.negativePrompt"
              type="textarea"
              autogrow
              label="Negative prompt"
              outlined
              :disable="!selectedJobSlug"
            >
              <template #append>
                <q-icon name="help_outline" size="16px" class="text-primary cursor-pointer">
                  <q-tooltip class="model-help-tooltip bg-primary text-white">
                    Describe elements to avoid in the output.
                  </q-tooltip>
                </q-icon>
              </template>
            </q-input>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <div v-if="!selectedJobSlug" class="text-caption text-grey-7 q-mr-sm">
          Select a job to save execution settings.
        </div>
        <div v-else-if="saveMessage" class="text-caption text-positive q-mr-sm">
          {{ saveMessage }}
        </div>
        <q-btn
          color="primary"
          label="Save To Job"
          :disable="!selectedJobSlug || Boolean(saveDisabledReason)"
          :loading="saving"
          @click="saveExecution"
        />
      </q-card-actions>

      <q-banner v-if="saveDisabledReason" rounded class="bg-amber-1 text-amber-10 q-ma-md">
        {{ saveDisabledReason }}
      </q-banner>
    </q-card>

    <q-banner v-if="!jobs.length" rounded class="bg-grey-2 text-grey-8 q-mt-md">
      Create a job in the Jobs tab first, then configure model settings here.
    </q-banner>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import {
  listJobs,
  getJob,
  listModels,
  updateJobExecution,
  listGeneratedImages,
  resolveApiAssetUrl,
} from '../api/jobs.js';

const props = defineProps({
  active: { type: Boolean, default: false },
  refreshToken: { type: Number, default: 0 },
});

const loading = ref(false);
const saving = ref(false);
const error = ref('');
const saveMessage = ref('');
const jobs = ref([]);
const models = ref([]);
const selectedJobSlug = ref(null);
const generatedImages = ref([]);
const selectedInputImage = ref(null);
const selectedCharacterRefImage = ref(null);

const execution = ref({
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
});

const jobOptions = computed(() =>
  jobs.value.map((job) => ({ label: job.name, value: job.slug }))
);

const selectedJobName = computed(() =>
  jobs.value.find((j) => j.slug === selectedJobSlug.value)?.name || selectedJobSlug.value || 'selected job'
);

const modelOptions = computed(() =>
  models.value.map((m) => ({ label: m.id, value: m.id }))
);

const selectedModel = computed(() =>
  models.value.find((m) => m.id === execution.value.model) || models.value[0] || null
);

const aspectRatioOptions = computed(() => {
  const values = selectedModel.value?.settings?.aspectRatios || [];
  return values.map((v) => ({ label: v, value: v }));
});

const resolutionOptions = computed(() => {
  const values = selectedModel.value?.settings?.resolutions || [];
  return values.map((v) => ({ label: v, value: v }));
});

const isFluxModel = computed(() => {
  const modelId = execution.value.model || '';
  return modelId === 'flux/schnell' || modelId === 'flux/dev';
});

const isPulidModel = computed(() => {
  const modelId = execution.value.model || '';
  return modelId === 'flux/pulid';
});

const isChainCompatibleModel = computed(() => isFluxModel.value || isPulidModel.value);

const hasCharacterReference = computed(() => String(execution.value.settings.characterReferenceUrl || '').trim().length > 0);

const characterReferencePreviewUrl = computed(() => {
  const value = String(execution.value.settings.characterReferenceUrl || '').trim();
  return value ? resolveApiAssetUrl(value) : '';
});

const saveDisabledReason = computed(() => {
  if (!selectedJobSlug.value) return '';

  if (execution.value.settings.characterChaining && !isChainCompatibleModel.value) {
    return 'Character Chain is only supported on flux/dev, flux/schnell, or flux/pulid.';
  }

  if (execution.value.settings.characterChaining && isPulidModel.value && !hasCharacterReference.value) {
    return 'flux/pulid with Character Chain requires a Character Reference image.';
  }

  return '';
});

const generatedImageOptions = computed(() =>
  generatedImages.value.map((img) => ({
    label: [
      img.jobName,
      img.subcategory || 'No subcategory',
      img.description || 'No description',
      new Date(img.createdAt).toLocaleString(),
    ].join(' · '),
    value: img.publicLocalPath || img.imageUrl,
  }))
);

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function chooseInputImage(imagePathOrUrl) {
  if (!imagePathOrUrl) {
    selectedInputImage.value = null;
    execution.value.settings.input_url = '';
    return;
  }

  try {
    selectedInputImage.value = imagePathOrUrl;
    const src = resolveApiAssetUrl(imagePathOrUrl);

    const res = await fetch(src);
    if (!res.ok) {
      throw new Error(`Failed to fetch selected image (${res.status})`);
    }
    const blob = await res.blob();
    const dataUrl = await toDataUrl(blob);
    execution.value.settings.input_url = String(dataUrl);
  } catch (e) {
    error.value = e.message || 'Could not convert selected image to base64';
  }
}

async function chooseCharacterReferenceImage(imagePathOrUrl) {
  if (!imagePathOrUrl) {
    selectedCharacterRefImage.value = null;
    execution.value.settings.characterReferenceUrl = '';
    return;
  }

  try {
    selectedCharacterRefImage.value = imagePathOrUrl;
    execution.value.settings.characterReferenceUrl = resolveApiAssetUrl(imagePathOrUrl);
  } catch (e) {
    error.value = e.message || 'Could not convert selected character reference image';
  }
}

async function loadGeneratedImages() {
  try {
    generatedImages.value = await listGeneratedImages();
  } catch {
    generatedImages.value = [];
  }
}

function specificOptionHelp(key) {
  if (key === 'rendering_speed') {
    return 'Ideogram quality/speed mode: TURBO is fastest, QUALITY is highest fidelity.';
  }
  if (key === 'strength') {
    return 'How strongly the model follows the input image (0.0 to 1.0).';
  }
  if (key === 'input_url') {
    return 'Base64 image data or URL used as visual input (primarily for FLUX image-to-image workflows).';
  }
  return 'Model-specific parameter.';
}

watch(selectedModel, (model) => {
  if (!model) return;
  if (!model.settings.aspectRatios.includes(execution.value.settings.aspectRatio)) {
    execution.value.settings.aspectRatio = model.settings.aspectRatios[0] || '1:1';
  }
  if (!model.settings.resolutions.includes(execution.value.settings.resolution)) {
    execution.value.settings.resolution = model.settings.resolutions[0] || '1024x1024';
  }

  if (!Object.prototype.hasOwnProperty.call(execution.value.settings, 'seed')) {
    execution.value.settings = { ...execution.value.settings, seed: null };
  }

  if (!Object.prototype.hasOwnProperty.call(execution.value.settings, 'characterChaining')) {
    execution.value.settings = { ...execution.value.settings, characterChaining: false };
  }
  if (!Object.prototype.hasOwnProperty.call(execution.value.settings, 'characterStrength')) {
    execution.value.settings = { ...execution.value.settings, characterStrength: 0.4 };
  }
  if (!Object.prototype.hasOwnProperty.call(execution.value.settings, 'characterIdScale')) {
    execution.value.settings = { ...execution.value.settings, characterIdScale: 0.8 };
  }
  if (!Object.prototype.hasOwnProperty.call(execution.value.settings, 'characterReferenceUrl')) {
    execution.value.settings = { ...execution.value.settings, characterReferenceUrl: '' };
  }

  if (!isChainCompatibleModel.value && execution.value.settings.characterChaining) {
    execution.value.settings = { ...execution.value.settings, characterChaining: false };
  }

  if (!isPulidModel.value) {
    if (Object.prototype.hasOwnProperty.call(execution.value.settings, 'id_scale')) {
      const cleanPulid = { ...execution.value.settings };
      delete cleanPulid.id_scale;
      delete cleanPulid.reference_image_url;
      execution.value.settings = cleanPulid;
    }
  }

  // Set defaults for any specific options not already in the execution settings
  for (const opt of (model.specificOptions || [])) {
    if (!Object.prototype.hasOwnProperty.call(execution.value.settings, opt.key)) {
      execution.value.settings = { ...execution.value.settings, [opt.key]: opt.default };
    }
  }
  // Clear specific options that belong to a different model
  const validKeys = new Set((model.specificOptions || []).map((o) => o.key));
  const globalKeys = new Set([
    'aspectRatio',
    'resolution',
    'negativePrompt',
    'seed',
    'characterChaining',
    'characterStrength',
    'characterIdScale',
    'characterReferenceUrl',
  ]);
  const staleKeys = Object.keys(execution.value.settings).filter(
    (k) => !globalKeys.has(k) && !validKeys.has(k)
  );
  if (staleKeys.length) {
    const clean = { ...execution.value.settings };
    staleKeys.forEach((k) => delete clean[k]);
    execution.value.settings = clean;
  }
});

watch(selectedJobSlug, async (slug) => {
  if (!slug) return;
  try {
    const job = await getJob(slug);
    const modelObj = models.value.find((m) => m.id === (job.execution?.model || 'nano-banana-2'));
    const specificSettings = {};
    for (const opt of (modelObj?.specificOptions || [])) {
      specificSettings[opt.key] = job.execution?.settings?.[opt.key] ?? opt.default;
    }
    execution.value = {
      provider: job.execution?.provider || 'fal-ai',
      model: job.execution?.model || 'nano-banana-2',
      settings: {
        aspectRatio: job.execution?.settings?.aspectRatio || '1:1',
        resolution: job.execution?.settings?.resolution || '1024x1024',
        negativePrompt: job.execution?.settings?.negativePrompt || '',
        seed: Object.prototype.hasOwnProperty.call(job.execution?.settings || {}, 'seed')
          ? job.execution.settings.seed
          : null,
        characterChaining: Boolean(job.execution?.settings?.characterChaining),
        characterStrength: Number.isFinite(Number(job.execution?.settings?.characterStrength))
          ? Number(job.execution.settings.characterStrength)
          : 0.4,
        characterIdScale: Number.isFinite(Number(job.execution?.settings?.characterIdScale))
          ? Number(job.execution.settings.characterIdScale)
          : 0.8,
        characterReferenceUrl: job.execution?.settings?.characterReferenceUrl || '',
        ...specificSettings,
      },
    };
    selectedCharacterRefImage.value = null;
  } catch (e) {
    error.value = e.message || 'Failed to load selected job';
  }
});

async function loadAll() {
  loading.value = true;
  error.value = '';
  saveMessage.value = '';
  try {
    const [jobsList, modelCatalog] = await Promise.all([listJobs(), listModels()]);
    jobs.value = jobsList;
    models.value = modelCatalog.models || [];
    await loadGeneratedImages();

    if (!selectedJobSlug.value && jobsList.length) {
      selectedJobSlug.value = jobsList[0].slug;
    }
  } catch (e) {
    error.value = e.message || 'Failed to load models';
  } finally {
    loading.value = false;
  }
}

async function saveExecution() {
  if (!selectedJobSlug.value) {
    error.value = 'Select a job before saving model settings.';
    return;
  }
  if (saveDisabledReason.value) {
    error.value = saveDisabledReason.value;
    return;
  }
  saving.value = true;
  error.value = '';
  saveMessage.value = '';
  try {
    const normalized = {
      ...execution.value,
      settings: {
        ...execution.value.settings,
        seed: Number.isInteger(Number(execution.value.settings.seed))
          ? Number(execution.value.settings.seed)
          : null,
        characterChaining: Boolean(execution.value.settings.characterChaining),
        characterStrength: Number.isFinite(Number(execution.value.settings.characterStrength))
          ? Number(execution.value.settings.characterStrength)
          : 0.4,
        characterIdScale: Number.isFinite(Number(execution.value.settings.characterIdScale))
          ? Number(execution.value.settings.characterIdScale)
          : 0.8,
        characterReferenceUrl: String(execution.value.settings.characterReferenceUrl || ''),
      },
    };

    if (isPulidModel.value) {
      normalized.settings.id_scale = normalized.settings.characterIdScale;
      normalized.settings.reference_image_url = normalized.settings.characterReferenceUrl;
    }

    const response = await updateJobExecution(selectedJobSlug.value, normalized);
    if (response?.execution) {
      execution.value = {
        provider: response.execution.provider,
        model: response.execution.model,
        settings: {
          ...response.execution.settings,
        },
      };
    }
    saveMessage.value = `Saved to ${selectedJobName.value}.`;
  } catch (e) {
    error.value = e.message || 'Failed to save model settings';
  } finally {
    saving.value = false;
  }
}

onMounted(loadAll);

watch(
  () => props.active,
  (isActive) => {
    if (isActive) loadAll();
  }
);

watch(
  () => props.refreshToken,
  () => {
    if (props.active) loadAll();
  }
);
</script>
