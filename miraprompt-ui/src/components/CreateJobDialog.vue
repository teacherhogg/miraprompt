<template>
  <q-dialog v-model="open" persistent>
    <q-card style="min-width: 400px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Create New Job</div>
        <q-space />
        <q-btn flat dense round icon="close" v-close-popup :disable="saving" />
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="jobName"
          label="Job name"
          outlined autofocus
          :error="!!error"
          :error-message="error"
          @keyup.enter="submit"
        />
        <q-select
          v-model="cloneFromSlug"
          class="q-mt-md"
          :options="cloneOptions"
          label="Use existing job as template (optional)"
          outlined
          emit-value
          map-options
          clearable
          :loading="loadingJobs"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup :disable="saving" />
        <q-btn
          :label="promptPayload ? 'Create & Add Prompt' : 'Create Job'"
          color="primary"
          :loading="saving"
          :disable="!jobName.trim()"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { createJob, addPrompt, listJobs } from '../api/jobs.js';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  promptPayload: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'created']);

const open = ref(props.modelValue);
watch(() => props.modelValue, (v) => { open.value = v; });
watch(open, (v) => { emit('update:modelValue', v); });

const jobName = ref('');
const saving = ref(false);
const error = ref('');
const loadingJobs = ref(false);
const existingJobs = ref([]);
const cloneFromSlug = ref(null);

const cloneOptions = computed(() =>
  existingJobs.value.map((job) => ({
    label: `${job.name} (${job.promptCount} prompt${job.promptCount === 1 ? '' : 's'})`,
    value: job.slug,
  }))
);

watch(open, (v) => {
  if (v) {
    jobName.value = '';
    error.value = '';
    cloneFromSlug.value = null;
    loadJobs();
  }
});

async function loadJobs() {
  loadingJobs.value = true;
  try {
    existingJobs.value = await listJobs();
  } catch {
    existingJobs.value = [];
  } finally {
    loadingJobs.value = false;
  }
}

async function submit() {
  if (!jobName.value.trim()) return;
  saving.value = true;
  error.value = '';
  try {
    const job = await createJob(jobName.value.trim(), cloneFromSlug.value || null);
    if (props.promptPayload) {
      await addPrompt(job.slug, props.promptPayload);
    }
    emit('created', job);
    open.value = false;
  } catch (e) {
    error.value = e.message || 'Something went wrong';
  } finally {
    saving.value = false;
  }
}
</script>
