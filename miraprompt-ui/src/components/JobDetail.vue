<template>
  <div>
    <!-- header row -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <q-btn flat dense round icon="arrow_back" @click="emit('back')">
        <q-tooltip>Back to jobs</q-tooltip>
      </q-btn>
      <div class="text-h6 q-ml-sm">{{ job?.name }}</div>
      <q-chip v-if="job" dense color="grey-3" text-color="grey-8" size="sm">
        {{ job.prompts.length }} prompt{{ job.prompts.length !== 1 ? 's' : '' }}
      </q-chip>
      <q-chip
        v-if="job"
        dense
        :color="runStatusChip.color"
        :text-color="runStatusChip.textColor"
        size="sm"
      >
        {{ runStatusChip.label }}
      </q-chip>
      <q-space />
      <q-btn
        outline
        color="primary"
        icon="play_circle_outline"
        label="Start"
        :disable="hasRunBefore && job?.status !== 'in-progress'"
        @click="startJob"
      />
      <q-btn
        outline
        color="negative"
        icon="stop_circle"
        label="Stop"
        :disable="job?.status !== 'in-progress'"
        @click="stopJob"
      />
      <q-btn outline color="grey-7" icon="bar_chart" label="View Progress" @click="showProgressDialog = true" />
    </div>

    <q-banner
      v-if="job && hasRunBefore && job.status !== 'in-progress'"
      rounded
      class="bg-amber-1 text-amber-10 q-mb-md"
    >
      This job already has successful outputs. Duplicate it from <strong>Create New Job</strong> to run again and preserve prior outputs.
    </q-banner>

    <q-banner v-if="progress" rounded class="bg-grey-2 text-grey-8 q-mb-md">
      Progress: {{ progress.completed }}/{{ progress.total }} completed,
      {{ progress.failed }} failed,
      {{ progress.running }} running.
    </q-banner>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner size="48px" />
    </div>

    <q-banner v-else-if="error" rounded class="bg-negative text-white q-mb-md">
      {{ error }}
    </q-banner>

    <template v-else-if="job">
      <q-banner v-if="!job.prompts.length" rounded class="bg-grey-2 text-grey-8">
        No prompts in this job yet. Go to the Prompt tab and click <em>Add to Job</em>.
      </q-banner>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle1">Execution Settings</div>
          <div class="style-chips-row q-mt-sm">
            <q-chip
              v-for="chip in executionChips"
              :key="chip"
              dense
              color="blue-1"
              text-color="blue-10"
            >
              {{ chip }}
            </q-chip>
          </div>
        </q-card-section>
      </q-card>

      <q-table
        v-if="job.prompts.length"
        flat bordered
        :rows="job.prompts"
        :columns="columns"
        row-key="id"
        hide-bottom
      >
        <template #body-cell-generation="props">
          <q-td :props="props">
            <q-chip
              dense
              :color="generationStatusChip(props.row).color"
              :text-color="generationStatusChip(props.row).textColor"
              size="sm"
            >
              {{ generationStatusChip(props.row).label }}
            </q-chip>
          </q-td>
        </template>
        <template #body-cell-chain="props">
          <q-td :props="props" class="q-gutter-x-sm">
            <q-chip
              dense
              :color="chainStatusChip(props.row).color"
              :text-color="chainStatusChip(props.row).textColor"
              size="sm"
            >
              {{ chainStatusChip(props.row).label }}
            </q-chip>
            <q-btn
              flat
              dense
              round
              icon="info"
              size="sm"
              :disable="!promptChainDiagnostics(props.row)"
              @click="showChainDetails(props.row)"
            >
              <q-tooltip>View chain diagnostics</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        <template #body-cell-subcategory="props">
          <q-td :props="props">
            <div>{{ props.row.subcategory || '—' }}</div>
            <q-chip
              v-if="isCharacterChain && props.rowIndex === 0"
              dense
              size="sm"
              color="teal-1"
              text-color="teal-10"
              class="q-mt-xs"
            >
              Anchor Prompt
            </q-chip>
          </q-td>
        </template>
        <template #body-cell-description="props">
          <q-td :props="props">
            <div class="cursor-pointer" style="min-width:220px; white-space:pre-wrap;">
              <span>{{ props.row.description || '—' }}</span>
              <q-popup-edit
                :model-value="props.row.description || ''"
                buttons
                label-set="Save"
                label-cancel="Cancel"
                :disable="job?.status === 'in-progress'"
                @save="(value) => savePromptDescription(props.row, value)"
              >
                <template #default="scope">
                  <q-input
                    v-model="scope.value"
                    type="textarea"
                    autogrow
                    dense
                    outlined
                    autofocus
                  />
                </template>
              </q-popup-edit>
            </div>
          </q-td>
        </template>
        <template #body-cell-styles="props">
          <q-td :props="props">
            <span class="text-caption text-grey-7">{{ stylesSummary(props.row.styles) }}</span>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-x-sm">
            <q-btn flat dense round icon="visibility" size="sm" @click="showPromptDetails(props.row)">
              <q-tooltip>View prompt JSON</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="delete_outline" color="negative" size="sm"
              @click="confirmDeletePrompt(props.row)">
              <q-tooltip>Remove prompt</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <q-expansion-item
        v-if="failedPrompts.length"
        class="q-mt-md"
        icon="error_outline"
        label="Failure Diagnostics"
        :caption="`${failedPrompts.length} failed prompt${failedPrompts.length !== 1 ? 's' : ''}`"
        header-class="bg-red-1 text-red-10"
        default-opened
        expand-separator
      >
        <q-card flat bordered>
          <q-card-section class="q-pa-sm">
            <div
              v-for="prompt in failedPrompts"
              :key="prompt.id"
              class="q-pa-sm q-mb-sm"
              style="border: 1px solid rgba(0,0,0,0.08); border-radius: 8px;"
            >
              <div class="text-subtitle2">
                {{ prompt.category || 'Unknown category' }} / {{ prompt.subcategory || 'Unknown subcategory' }}
              </div>
              <div class="text-caption text-grey-8 q-mt-xs">
                {{ prompt.description || 'No description' }}
              </div>
              <div class="text-body2 text-red-10 q-mt-sm" style="white-space: pre-wrap;">
                {{ prompt.generation?.error || 'No error message captured' }}
              </div>
              <pre
                v-if="prompt.generation?.metadata"
                class="q-mt-sm"
                style="white-space: pre-wrap; word-break: break-word; font-size: 12px; background: #fafafa; border-radius: 6px; padding: 8px;"
              >{{ JSON.stringify(prompt.generation.metadata, null, 2) }}</pre>
            </div>
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <q-card flat bordered class="q-mt-md" v-if="generatedImages.length">
        <q-card-section>
          <div class="text-h6">Generated Images</div>
          <div class="text-caption text-grey-7">
            All images generated for this job.
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="job-image-grid">
            <div
              v-for="img in generatedImages"
              :key="`${img.promptId}-${img.completedAt || img.createdAt}`"
              class="job-image-card generated-grid-item"
              @click="lightboxImage = img"
            >
              <q-img
                :src="img.imageUrl || img.publicLocalPath"
                ratio="1"
                class="rounded-borders"
              />
              <div class="text-caption text-grey-8 q-mt-xs">
                {{ img.subcategory || 'No subcategory' }}
              </div>
              <div class="text-caption text-grey-6">
                {{ img.completedAt ? new Date(img.completedAt).toLocaleString() : 'No completion time' }}
              </div>
              <div class="style-chips-row">
                <span
                  v-for="chip in getImageChips(img)"
                  :key="chip.option"
                  :class="['style-chip', `scope-${chip.scope}`]"
                  :title="chip.option"
                >{{ chip.option }}</span>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-dialog v-model="lightboxOpen" maximized>
        <q-card class="column" style="max-width:900px; margin:auto; height:100%">
          <q-card-section class="row items-center justify-between q-pb-none">
            <div class="text-h6">{{ lightboxImage?.subcategory || 'Generated Image' }}</div>
            <q-btn flat dense round icon="close" @click="lightboxImage = null" />
          </q-card-section>
          <q-separator />
          <q-card-section class="col q-pa-md" style="overflow:auto">
            <q-img
              v-if="lightboxImage"
              :src="lightboxImage.imageUrl || lightboxImage.publicLocalPath"
              fit="contain"
              style="max-height:60vh; width:100%; object-fit:contain"
              class="rounded-borders"
            />
            <q-banner v-if="lightboxImage" rounded class="bg-grey-2 text-grey-8 q-mt-md">
              <div class="text-subtitle2">Prompt</div>
              <div class="text-body2 q-mt-xs">{{ lightboxImage.transformedPrompt || lightboxImage.description || 'No prompt text available.' }}</div>
            </q-banner>
            <q-banner v-if="executionChips.length" rounded class="bg-blue-1 text-blue-10 q-mt-md">
              <div class="text-subtitle2">Execution Settings</div>
              <div class="q-mt-xs" style="display:flex; flex-wrap:wrap; gap:6px;">
                <q-chip
                  v-for="chip in executionChips"
                  :key="`lightbox-${chip}`"
                  dense
                  color="white"
                  text-color="blue-10"
                >
                  {{ chip }}
                </q-chip>
              </div>
            </q-banner>
            <div v-if="lightboxImage" class="style-chips-row q-mt-md">
              <span
                v-for="chip in getImageChips(lightboxImage)"
                :key="chip.option"
                :class="['style-chip', `scope-${chip.scope}`]"
                :title="chip.option"
              >{{ chip.option }}</span>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-actions align="right">
            <q-btn flat label="Close" @click="lightboxImage = null" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </template>

    <!-- progress details dialog -->
    <q-dialog v-model="showProgressDialog">
      <q-card style="min-width:320px">
        <q-card-section>
          <div class="text-h6">Progress Details</div>
          <div class="text-body2 q-mt-sm text-grey-7" v-if="progress">
            Status: {{ progress.status }}<br>
            Completed: {{ progress.completed }}/{{ progress.total }}<br>
            Failed: {{ progress.failed }}<br>
            Running: {{ progress.running }}
          </div>
          <div class="text-body2 q-mt-sm text-grey-7" v-else>
            Progress has not been loaded yet.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="OK" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- prompt details dialog -->
    <q-dialog v-model="showPromptDialog" maximized>
      <q-card>
        <q-card-section class="row items-center justify-between">
          <div class="row items-center q-gutter-sm">
            <q-btn flat dense round icon="arrow_back" v-close-popup>
              <q-tooltip>Back</q-tooltip>
            </q-btn>
            <div class="text-h6">Prompt Details JSON</div>
          </div>
          <q-btn flat dense label="Close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <pre style="white-space: pre-wrap; word-break: break-word; font-size: 13px;">{{ promptDialogJson }}</pre>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- chain diagnostics dialog -->
    <q-dialog v-model="showChainDialog" maximized>
      <q-card>
        <q-card-section class="row items-center justify-between">
          <div class="row items-center q-gutter-sm">
            <q-btn flat dense round icon="arrow_back" v-close-popup>
              <q-tooltip>Back</q-tooltip>
            </q-btn>
            <div class="text-h6">Chain Diagnostics JSON</div>
          </div>
          <q-btn flat dense label="Close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <pre style="white-space: pre-wrap; word-break: break-word; font-size: 13px;">{{ chainDialogJson }}</pre>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- delete prompt confirm -->
    <q-dialog v-model="showDeletePrompt" persistent>
      <q-card>
        <q-card-section>
          <div class="text-h6">Remove prompt?</div>
          <div class="text-body2 q-mt-sm text-grey-7">
            This action cannot be undone.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn label="Remove" color="negative" :loading="deletingPrompt" @click="doDeletePrompt" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { getJob, deletePrompt, startJobRun, stopJobRun, getJobProgress, updatePrompt } from '../api/jobs.js';
import styleData from '../assets/custom-styles.json';
import { getStyleChips } from '../utils/style-data.js';

const props = defineProps({
  slug: { type: String, required: true },
});
const emit = defineEmits(['back', 'deleted']);

const job = ref(null);
const loading = ref(false);
const error = ref('');
const showProgressDialog = ref(false);
const showDeletePrompt = ref(false);
const pendingPromptId = ref(null);
const deletingPrompt = ref(false);
const showPromptDialog = ref(false);
const promptDialogJson = ref('');
const showChainDialog = ref(false);
const chainDialogJson = ref('');
const progress = ref(null);
const lightboxImage = ref(null);
let pollTimer = null;

const lightboxOpen = computed({
  get: () => lightboxImage.value !== null,
  set: (v) => { if (!v) lightboxImage.value = null; },
});

const hasRunBefore = computed(() => {
  if (!job.value) return false;
  return (job.value.prompts || []).some(
    (p) => p?.generation?.status === 'completed' && (p?.generation?.imageUrl || p?.generation?.localFilePath)
  );
});

const generatedImages = computed(() => {
  if (!job.value?.prompts) return [];
  return job.value.prompts
    .filter((prompt) => prompt?.generation?.imageUrl || prompt?.generation?.localFilePath)
    .map((prompt) => ({
      promptId: prompt.id,
      subcategory: prompt.subcategory,
      category: prompt.category,
      description: prompt.description || null,
      transformedPrompt: prompt.transformedPrompt || null,
      styles: prompt.styles || {},
      imageUrl: prompt.generation?.imageUrl || null,
      publicLocalPath: prompt.generation?.localFilePath
        ? `/${String(prompt.generation.localFilePath).replace(/\\/g, '/')}`
        : null,
      completedAt: prompt.generation?.completedAt || null,
      createdAt: prompt.createdAt || null,
    }));
});

const failedPrompts = computed(() => {
  if (!job.value?.prompts) return [];
  return job.value.prompts.filter((p) => p?.generation?.status === 'failed');
});

const isCharacterChain = computed(() => Boolean(job.value?.execution?.settings?.characterChaining));

const executionChips = computed(() => {
  if (!job.value?.execution) return [];
  const chips = [];
  chips.push(`provider: ${job.value.execution.provider || '—'}`);
  chips.push(`model: ${job.value.execution.model || '—'}`);

  const settings = job.value.execution.settings || {};
  if (settings.characterChaining) {
    const model = job.value.execution.model || '';
    const chainMode = model === 'flux/pulid' ? 'pulid identity' : 'flux img2img';
    chips.push(`character-chain: ON (${chainMode})`);
  } else {
    chips.push('character-chain: OFF');
  }

  Object.keys(settings)
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      const value = settings[key];
      if (value === null || value === undefined || value === '') {
        chips.push(`${key}: —`);
        return;
      }
      if (key === 'input_url') {
        chips.push(`${key}: [${String(value).length} chars]`);
        return;
      }
      if (key === 'characterReferenceUrl' || key === 'reference_image_url') {
        chips.push(`${key}: [${String(value).length} chars]`);
        return;
      }
      chips.push(`${key}: ${String(value)}`);
    });

  return chips;
});

function getImageChips(img) {
  return getStyleChips(styleData, img.category, img.subcategory, img.styles);
};

const runStatusChip = computed(() => {
  const status = job.value?.status || 'never';
  const lastRunAt = job.value?.lastRunAt;

  if (status === 'in-progress') {
    return { label: 'In progress', color: 'orange-2', textColor: 'orange-10' };
  }

  if (lastRunAt) {
    return {
      label: `Last run: ${new Date(lastRunAt).toLocaleString()}`,
      color: 'blue-1',
      textColor: 'blue-10'
    };
  }

  return { label: 'Never run', color: 'grey-3', textColor: 'grey-8' };
});

const columns = [
  { name: 'category', label: 'Category', field: 'category', align: 'left' },
  { name: 'subcategory', label: 'Subcategory', field: 'subcategory', align: 'left' },
  {
    name: 'generation',
    label: 'Status',
    field: (row) => row?.generation?.status || 'not-started',
    align: 'left',
  },
  {
    name: 'chain',
    label: 'Chain',
    field: (row) => row?.generation?.metadata?.chainDiagnostics?.mode || '—',
    align: 'left',
  },
  { name: 'description', label: 'Description', field: 'description', align: 'left',
    format: (v) => v || '—' },
  { name: 'styles', label: 'Styles', field: 'styles', align: 'left' },
  { name: 'createdAt', label: 'Added', field: 'createdAt', align: 'left',
    format: (v) => new Date(v).toLocaleString() },
  { name: 'actions', label: '', field: 'actions', align: 'center' },
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    job.value = await getJob(props.slug);
  } catch (e) {
    error.value = e.message || 'Failed to load job';
  } finally {
    loading.value = false;
  }
}

async function loadProgress() {
  try {
    progress.value = await getJobProgress(props.slug);
  } catch {
    // keep UI resilient when progress endpoint fails transiently
  }
}

async function startJob() {
  if (hasRunBefore.value) {
    error.value = 'Job already has successful generated images. Duplicate the job to run again.';
    return;
  }

  const modelId = job.value?.execution?.model || '';
  const settings = job.value?.execution?.settings || {};
  const chainEnabled = Boolean(settings.characterChaining);
  const isChainModel = modelId === 'flux/dev' || modelId === 'flux/schnell' || modelId === 'flux/pulid';
  const hasReference = String(settings.characterReferenceUrl || '').trim().length > 0;

  if (chainEnabled && !isChainModel) {
    error.value = 'Character Chain can only run with flux/dev, flux/schnell, or flux/pulid.';
    return;
  }

  if (chainEnabled && modelId === 'flux/pulid' && !hasReference) {
    error.value = 'flux/pulid requires a Character Reference image when Character Chain is enabled.';
    return;
  }

  try {
    await startJobRun(props.slug);
    await load();
    await loadProgress();
    startPolling();
  } catch (e) {
    error.value = e.message || 'Failed to start job';
  }
}

async function stopJob() {
  try {
    await stopJobRun(props.slug);
    await load();
    await loadProgress();
    stopPolling();
  } catch (e) {
    error.value = e.message || 'Failed to stop job';
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    await load();
    await loadProgress();
    if (job.value?.status !== 'in-progress') {
      stopPolling();
    }
  }, 2500);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function stylesSummary(styles) {
  if (!styles || !Object.keys(styles).length) return '—';
  const dims = Object.keys(styles);
  const total = dims.reduce((acc, d) => acc + Object.values(styles[d]).flat().length, 0);
  return `${total} selection${total !== 1 ? 's' : ''} across ${dims.length} dimension${dims.length !== 1 ? 's' : ''}`;
}

function generationStatusChip(row) {
  const status = row?.generation?.status || 'not-started';
  if (status === 'completed') return { label: 'Completed', color: 'positive', textColor: 'white' };
  if (status === 'failed') return { label: 'Failed', color: 'negative', textColor: 'white' };
  if (status === 'skipped') return { label: 'Skipped', color: 'grey-5', textColor: 'white' };
  if (status === 'in-progress') return { label: 'Running', color: 'orange-4', textColor: 'white' };
  return { label: 'Not started', color: 'grey-3', textColor: 'grey-8' };
}

function promptChainDiagnostics(row) {
  return row?.generation?.metadata?.chainDiagnostics || null;
}

function chainStatusChip(row) {
  const diag = promptChainDiagnostics(row);
  if (!diag) return { label: 'N/A', color: 'grey-3', textColor: 'grey-8' };
  if (!diag.enabled) return { label: 'Off', color: 'grey-3', textColor: 'grey-8' };
  if (row?.generation?.status === 'skipped') return { label: 'Skipped', color: 'grey-5', textColor: 'white' };
  if (diag.applied) {
    const modeLabel = diag.mode === 'pulid-identity' ? 'Applied (PuLID)' : 'Applied (FLUX)';
    return { label: modeLabel, color: 'teal-2', textColor: 'teal-10' };
  }
  if (diag.mode === 'unsupported-model') return { label: 'Unsupported model', color: 'amber-2', textColor: 'amber-10' };
  return { label: 'Anchor step', color: 'blue-1', textColor: 'blue-10' };
}

function confirmDeletePrompt(prompt) {
  pendingPromptId.value = prompt.id;
  showDeletePrompt.value = true;
}

function showPromptDetails(prompt) {
  promptDialogJson.value = JSON.stringify(
    {
      execution: job.value?.execution || null,
      prompt,
    },
    null,
    2
  );
  showPromptDialog.value = true;
}

async function savePromptDescription(prompt, nextDescription) {
  const previousDescription = prompt.description || '';
  const normalizedDescription = String(nextDescription || '');

  if (normalizedDescription === previousDescription) {
    return;
  }

  error.value = '';
  try {
    const updatedPrompt = await updatePrompt(props.slug, prompt.id, {
      description: normalizedDescription,
    });
    const target = job.value?.prompts?.find((p) => p.id === prompt.id);
    if (target) {
      target.description = updatedPrompt.description || '';
      target.transformedPrompt = updatedPrompt.transformedPrompt || null;
    }
  } catch (e) {
    error.value = e.message || 'Failed to update prompt description';
  }
}

function showChainDetails(prompt) {
  chainDialogJson.value = JSON.stringify(
    {
      promptId: prompt.id,
      status: prompt.generation?.status || null,
      chainDiagnostics: promptChainDiagnostics(prompt),
    },
    null,
    2
  );
  showChainDialog.value = true;
}

async function doDeletePrompt() {
  if (!pendingPromptId.value) return;
  deletingPrompt.value = true;
  try {
    await deletePrompt(props.slug, pendingPromptId.value);
    job.value.prompts = job.value.prompts.filter((p) => p.id !== pendingPromptId.value);
    showDeletePrompt.value = false;
    pendingPromptId.value = null;
  } catch (e) {
    error.value = e.message || 'Failed to remove prompt';
    showDeletePrompt.value = false;
  } finally {
    deletingPrompt.value = false;
  }
}

onMounted(async () => {
  await load();
  await loadProgress();
  if (job.value?.status === 'in-progress') {
    startPolling();
  }
});

onUnmounted(() => {
  stopPolling();
  lightboxImage.value = null;
});
</script>
