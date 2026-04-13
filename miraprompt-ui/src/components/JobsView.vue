<template>
  <div>
    <!-- when a job is selected, show detail view -->
    <JobDetail
      v-if="openSlug"
      :slug="openSlug"
      @back="handleBack"
      @deleted="onJobDeleted"
    />

    <!-- job list -->
    <div v-else>
      <div class="row items-center justify-between q-mb-md q-pt-md q-pl-sm">
        <div class="row items-center q-gutter-sm">
          <div class="text-h6">Jobs</div>
        </div>
        <div class="row items-center q-gutter-sm">
          <q-btn color="primary" icon="add_circle_outline" label="Create New Job" @click="showCreateJob = true" />
          <q-btn flat dense round icon="refresh" @click="load" :loading="loading">
            <q-tooltip>Refresh</q-tooltip>
          </q-btn>
        </div>
      </div>

      <div v-if="loading && !jobs.length" class="flex flex-center q-pa-xl">
        <q-spinner size="48px" />
      </div>

      <q-banner v-else-if="error" rounded class="bg-negative text-white q-mb-md">
        {{ error }}
      </q-banner>

      <q-banner v-else-if="!jobs.length" rounded class="bg-grey-2 text-grey-8">
        No jobs yet. Click <strong>Create New Job</strong> above to get started.
      </q-banner>

      <q-table
        v-else
        flat bordered
        :rows="jobs"
        :columns="columns"
        row-key="slug"
        :loading="loading"
        hide-bottom
      >
        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-x-sm">
            <q-btn flat dense round icon="data_object" size="sm" @click="openPreview(props.row)">
              <q-tooltip>Preview prompts JSON</q-tooltip>
            </q-btn>
            <q-btn flat dense label="Open" icon="open_in_full" size="sm"
              @click="openSlug = props.row.slug" />
            <q-btn flat dense round icon="delete_outline" color="negative" size="sm"
              @click="confirmDelete(props.row)">
              <q-tooltip>Delete job</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Create New Job dialog -->
    <CreateJobDialog v-model="showCreateJob" @created="load" />

    <!-- delete confirm dialog -->
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card>
        <q-card-section>
          <div class="text-h6">Delete job?</div>
          <div class="text-body2 q-mt-sm">
            "<strong>{{ pendingDelete?.name }}</strong>" and all its prompts will be removed.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn label="Delete" color="negative" :loading="deleting" @click="doDelete" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- prompts preview dialog -->
    <q-dialog v-model="showPreview" maximized>
      <q-card>
        <q-card-section class="row items-center justify-between">
          <div class="text-h6">{{ previewJobName }} — Prompts JSON</div>
          <q-btn flat dense label="Close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section v-if="previewLoading" class="flex flex-center q-pa-xl">
          <q-spinner size="48px" />
        </q-card-section>
        <q-card-section v-else>
          <pre style="white-space: pre-wrap; word-break: break-word; font-size: 13px;">{{ previewJson }}</pre>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { listJobs, getJob, deleteJob } from '../api/jobs.js';
import JobDetail from './JobDetail.vue';
import CreateJobDialog from './CreateJobDialog.vue';

const jobs = ref([]);
const loading = ref(false);
const error = ref('');
const openSlug = ref(null);
const showCreateJob = ref(false);
const showDeleteConfirm = ref(false);
const pendingDelete = ref(null);
const deleting = ref(false);

// preview dialog
const showPreview = ref(false);
const previewJobName = ref('');
const previewJson = ref('');
const previewLoading = ref(false);

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'promptCount', label: 'Prompts', field: 'promptCount', align: 'center', sortable: true },
  {
    name: 'runStatus',
    label: 'Run Status',
    field: 'runStatus',
    align: 'left',
    sortable: true,
    format: (v) => v,
  },
  { name: 'createdAt', label: 'Created', field: 'createdAt', align: 'left', sortable: true,
    format: (v) => new Date(v).toLocaleString() },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const list = await listJobs();
    jobs.value = list.map((job) => {
      if (job.status === 'in-progress') {
        return { ...job, runStatus: 'In progress' };
      }
      if (job.lastRunAt) {
        return { ...job, runStatus: `Last run: ${new Date(job.lastRunAt).toLocaleString()}` };
      }
      return { ...job, runStatus: 'Never run' };
    });
  } catch (e) {
    error.value = e.message || 'Failed to load jobs';
  } finally {
    loading.value = false;
  }
}

function confirmDelete(job) {
  pendingDelete.value = job;
  showDeleteConfirm.value = true;
}

async function doDelete() {
  if (!pendingDelete.value) return;
  deleting.value = true;
  try {
    await deleteJob(pendingDelete.value.slug);
    showDeleteConfirm.value = false;
    jobs.value = jobs.value.filter((j) => j.slug !== pendingDelete.value.slug);
    pendingDelete.value = null;
  } catch (e) {
    error.value = e.message || 'Failed to delete job';
    showDeleteConfirm.value = false;
  } finally {
    deleting.value = false;
  }
}

function onJobDeleted(slug) {
  jobs.value = jobs.value.filter((j) => j.slug !== slug);
  openSlug.value = null;
}

function handleBack() {
  openSlug.value = null;
  load();
}

async function openPreview(row) {
  previewJobName.value = row.name;
  previewJson.value = '';
  previewLoading.value = true;
  showPreview.value = true;
  try {
    const job = await getJob(row.slug);
    previewJson.value = JSON.stringify(job.prompts, null, 2);
  } catch (e) {
    previewJson.value = `Error: ${e.message}`;
  } finally {
    previewLoading.value = false;
  }
}

onMounted(load);

const props = defineProps({
  active: { type: Boolean, default: false },
  refreshToken: { type: Number, default: 0 },
});

watch(
  () => props.active,
  (isActive) => {
    if (isActive) load();
  }
);

watch(
  () => props.refreshToken,
  () => {
    if (props.active) load();
  }
);
</script>
