<template>
  <q-dialog v-model="open" persistent>
    <q-card style="min-width: 420px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Add to Job</div>
        <q-space />
        <q-btn flat dense round icon="close" v-close-popup :disable="saving" />
      </q-card-section>

      <!-- mode toggle -->
      <q-card-section class="q-pb-none">
        <q-btn-toggle
          v-model="mode"
          spread
          no-caps
          toggle-color="secondary"
          :options="[
            { label: 'Existing Job', value: 'existing' },
            { label: 'Create New Job', value: 'new' },
          ]"
        />
      </q-card-section>

      <q-card-section>
        <!-- existing job mode -->
        <template v-if="mode === 'existing'">
          <div v-if="loading" class="flex flex-center q-pa-md">
            <q-spinner size="32px" />
          </div>
          <div v-else-if="loadError" class="text-negative">{{ loadError }}</div>
          <div v-else-if="jobs.length === 0" class="text-grey-7">
            No jobs yet. Switch to <strong>Create New Job</strong> to make one.
          </div>
          <q-select
            v-else
            v-model="selectedSlug"
            :options="jobOptions"
            label="Select a job"
            outlined emit-value map-options
            :error="!!error"
            :error-message="error"
          />
        </template>

        <!-- new job mode -->
        <template v-else>
          <q-input
            v-model="newJobName"
            label="New job name"
            outlined autofocus
            :error="!!error"
            :error-message="error"
          />
        </template>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup :disable="saving" />
        <q-btn
          v-if="mode === 'existing'"
          label="Add Prompt"
          color="secondary"
          :loading="saving"
          :disable="!selectedSlug || loading || jobs.length === 0"
          @click="submitExisting"
        />
        <q-btn
          v-else
          label="Create & Add"
          color="secondary"
          icon="add"
          :loading="saving"
          :disable="!newJobName.trim()"
          @click="submitNew"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { listJobs, addPrompt, createJob } from '../api/jobs.js';

// Session-local memory — persists across dialog opens within the same session
let lastUsedSlug = null;

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  promptPayload: { type: Object, required: true },
});
const emit = defineEmits(['update:modelValue']);

const open = ref(props.modelValue);
watch(() => props.modelValue, (v) => { open.value = v; });
watch(open, (v) => { emit('update:modelValue', v); });

const mode = ref('existing');
const jobs = ref([]);
const loading = ref(false);
const loadError = ref('');
const selectedSlug = ref(null);
const newJobName = ref('');
const saving = ref(false);
const error = ref('');

const jobOptions = computed(() =>
  jobs.value.map((j) => ({
    label: `${j.name} (${j.promptCount} prompt${j.promptCount !== 1 ? 's' : ''})`,
    value: j.slug,
  }))
);

watch(open, async (v) => {
  if (!v) {
    newJobName.value = '';
    error.value = '';
    return;
  }
  error.value = '';
  loading.value = true;
  loadError.value = '';
  try {
    jobs.value = await listJobs();
    const slugs = jobs.value.map((j) => j.slug);
    selectedSlug.value = lastUsedSlug && slugs.includes(lastUsedSlug) ? lastUsedSlug : null;
  } catch (e) {
    loadError.value = e.message || 'Failed to load jobs';
  } finally {
    loading.value = false;
  }
});

// Clear mode-specific error when switching
watch(mode, () => { error.value = ''; });

async function submitExisting() {
  if (!selectedSlug.value) return;
  saving.value = true;
  error.value = '';
  try {
    await addPrompt(selectedSlug.value, props.promptPayload);
    lastUsedSlug = selectedSlug.value;
    open.value = false;
  } catch (e) {
    error.value = e.message || 'Something went wrong';
  } finally {
    saving.value = false;
  }
}

async function submitNew() {
  const name = newJobName.value.trim();
  if (!name) return;
  saving.value = true;
  error.value = '';
  try {
    const newJob = await createJob(name);
    await addPrompt(newJob.slug, props.promptPayload);
    lastUsedSlug = newJob.slug;
    open.value = false;
  } catch (e) {
    error.value = e.message || 'Something went wrong';
  } finally {
    saving.value = false;
  }
}
</script>
