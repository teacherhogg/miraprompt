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
              outlined
              emit-value
              map-options
              :disable="!jobs.length"
            >
              <template #label>
                Job
                <q-icon name="help_outline" size="16px" class="q-ml-xs text-primary">
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
              outlined
              emit-value
              map-options
              :disable="!selectedJobSlug || !modelOptions.length"
            >
              <template #label>
                Model
                <q-icon name="help_outline" size="16px" class="q-ml-xs text-primary">
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
              outlined
              emit-value
              map-options
              :disable="!selectedJobSlug"
            >
              <template #label>
                Aspect ratio
                <q-icon name="help_outline" size="16px" class="q-ml-xs text-primary">
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
              outlined
              emit-value
              map-options
              :disable="!selectedJobSlug"
            >
              <template #label>
                Resolution
                <q-icon name="help_outline" size="16px" class="q-ml-xs text-primary">
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
              outlined
              :disable="!selectedJobSlug"
              hint="Leave empty for random"
            >
              <template #label>
                Seed (optional)
                <q-icon name="help_outline" size="16px" class="q-ml-xs text-primary">
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
                outlined
                emit-value
                map-options
                :disable="!selectedJobSlug"
              >
                <template #label>
                  {{ opt.label }}
                  <q-icon name="help_outline" size="16px" class="q-ml-xs text-primary">
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
                outlined
                :disable="!selectedJobSlug"
              >
                <template #label>
                  {{ opt.label }}
                  <q-icon name="help_outline" size="16px" class="q-ml-xs text-primary">
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
                outlined
                :disable="!selectedJobSlug"
              >
                <template #label>
                  {{ opt.label }}
                  <q-icon name="help_outline" size="16px" class="q-ml-xs text-primary">
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
              outlined
              emit-value
              map-options
              clearable
              :disable="!selectedJobSlug || !generatedImageOptions.length"
              @update:model-value="chooseInputImage"
              hint="Selected image is converted to base64 and stored in input_url"
            >
              <template #label>
                Choose Input Image from Previous Generations
                <q-icon name="help_outline" size="16px" class="q-ml-xs text-primary">
                  <q-tooltip class="model-help-tooltip bg-primary text-white">
                    Pick any previously generated image. It will be converted to base64 and saved to input_url.
                  </q-tooltip>
                </q-icon>
              </template>
            </q-select>
          </div>
          <div class="col-12">
            <q-input
              v-model="execution.settings.negativePrompt"
              type="textarea"
              autogrow
              outlined
              :disable="!selectedJobSlug"
            >
              <template #label>
                Negative prompt
                <q-icon name="help_outline" size="16px" class="q-ml-xs text-primary">
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
        <q-btn
          color="primary"
          label="Save To Job"
          :disable="!selectedJobSlug"
          :loading="saving"
          @click="saveExecution"
        />
      </q-card-actions>
    </q-card>

    <q-banner v-if="!jobs.length" rounded class="bg-grey-2 text-grey-8 q-mt-md">
      Create a job in the Jobs tab first, then configure model settings here.
    </q-banner>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { listJobs, getJob, listModels, updateJobExecution, listGeneratedImages } from '../api/jobs.js';

const props = defineProps({
  active: { type: Boolean, default: false },
  refreshToken: { type: Number, default: 0 },
});

const loading = ref(false);
const saving = ref(false);
const error = ref('');
const jobs = ref([]);
const models = ref([]);
const selectedJobSlug = ref(null);
const generatedImages = ref([]);
const selectedInputImage = ref(null);

const execution = ref({
  provider: 'fal-ai',
  model: 'nano-banana-2',
  settings: {
    aspectRatio: '1:1',
    resolution: '1024x1024',
    negativePrompt: '',
    seed: null,
  },
});

const jobOptions = computed(() =>
  jobs.value.map((job) => ({ label: job.name, value: job.slug }))
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

const generatedImageOptions = computed(() =>
  generatedImages.value.map((img) => ({
    label: `${img.jobName} · ${img.subcategory || 'No subcategory'} · ${new Date(img.createdAt).toLocaleString()}`,
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
    const src = String(imagePathOrUrl).startsWith('http')
      ? imagePathOrUrl
      : `${window.location.origin}${imagePathOrUrl}`;

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

  // Set defaults for any specific options not already in the execution settings
  for (const opt of (model.specificOptions || [])) {
    if (!Object.prototype.hasOwnProperty.call(execution.value.settings, opt.key)) {
      execution.value.settings = { ...execution.value.settings, [opt.key]: opt.default };
    }
  }
  // Clear specific options that belong to a different model
  const validKeys = new Set((model.specificOptions || []).map((o) => o.key));
  const staleKeys = Object.keys(execution.value.settings).filter(
    (k) => !['aspectRatio', 'resolution', 'negativePrompt', 'seed'].includes(k) && !validKeys.has(k)
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
        ...specificSettings,
      },
    };
  } catch (e) {
    error.value = e.message || 'Failed to load selected job';
  }
});

async function loadAll() {
  loading.value = true;
  error.value = '';
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
  if (!selectedJobSlug.value) return;
  saving.value = true;
  error.value = '';
  try {
    const normalized = {
      ...execution.value,
      settings: {
        ...execution.value.settings,
        seed: Number.isInteger(Number(execution.value.settings.seed))
          ? Number(execution.value.settings.seed)
          : null,
      },
    };
    await updateJobExecution(selectedJobSlug.value, normalized);
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
