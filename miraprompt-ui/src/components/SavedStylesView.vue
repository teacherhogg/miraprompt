<template>
  <div>
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row items-center justify-between q-gutter-sm">
        <div>
          <div class="text-h6">Saved Styles</div>
          <div class="text-body2 text-grey-7 q-mt-sm">
            Browse curated and user-created styles grouped by category.
          </div>
        </div>
        <div class="row items-center q-gutter-sm">
          <q-input
            v-model="filterText"
            dense
            outlined
            clearable
            debounce="150"
            placeholder="Filter categories or style names"
            style="min-width: 320px"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-btn flat dense round icon="refresh" :loading="loading" @click="loadSavedStyles">
            <q-tooltip>Refresh styles</q-tooltip>
          </q-btn>
          <q-btn label="Expand All" icon="unfold_more" color="primary" outline no-caps @click="expandAll" />
          <q-btn label="Collapse All" icon="unfold_less" color="primary" outline no-caps @click="collapseAll" />
        </div>
      </q-card-section>
    </q-card>

    <q-banner v-if="error" rounded class="bg-negative text-white q-mb-md">
      {{ error }}
    </q-banner>

    <q-list separator>
      <q-expansion-item
        v-for="section in filteredSections"
        :key="section.title"
        :model-value="Boolean(expandedState[section.title])"
        @update:model-value="(val) => onSectionToggle(section.title, val)"
        :label="section.title"
        :caption="`${section.items.length} style${section.items.length !== 1 ? 's' : ''}`"
        expand-separator
        header-class="expansion-header-primary"
      >
        <div class="q-pa-md">
          <div class="saved-grid">
            <q-card
              v-for="item in section.items"
              :key="`${section.title}|||${item.name}`"
              flat
              bordered
              class="saved-style-card"
              @click="openStyleDialog(item)"
            >
              <q-btn
                round
                dense
                size="sm"
                icon="edit"
                class="style-edit-btn"
                color="white"
                text-color="primary"
                @click.stop="openEditDialog(item)"
              />

              <q-card-section class="q-pb-sm">
                <div class="row items-center justify-between q-gutter-sm">
                  <div class="text-subtitle2 saved-style-name">{{ item.name }}</div>
                  <q-chip
                    dense
                    size="sm"
                    :color="item.isUserStyle ? 'teal-1' : 'grey-3'"
                    :text-color="item.isUserStyle ? 'teal-10' : 'grey-8'"
                  >
                    {{ item.isUserStyle ? 'User' : 'Built-in' }}
                  </q-chip>
                </div>
              </q-card-section>

              <q-img :src="resolveStyleImage(item)" :alt="item.name" fit="contain" class="saved-style-image">
                <template #error>
                  <div class="absolute-full flex flex-center bg-grey-3 text-grey-7 text-caption">
                    Image unavailable
                  </div>
                </template>
              </q-img>

              <q-card-section class="q-pt-sm">
                <div class="text-body2 saved-style-prompt">{{ item.prompt }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-expansion-item>
    </q-list>

    <q-banner v-if="!loading && !filteredSections.length" rounded class="bg-grey-2 text-grey-8 q-mt-md">
      No saved styles match that filter.
    </q-banner>

    <q-dialog v-model="confirmDialogOpen" persistent>
      <q-card style="min-width: 420px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Add to Current Prompt</div>
        </q-card-section>
        <q-card-section>
          <div class="text-subtitle2">{{ selectedStyle?.name || 'Saved style' }}</div>
          <div class="text-body2 text-grey-8 q-mt-sm">
            Do you want to add this style to the current prompt?
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="confirmDialogOpen = false" />
          <q-btn color="secondary" icon="add" label="Add to Prompt" @click="confirmAddToPrompt" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="editDialogOpen" persistent>
      <q-card style="min-width: 520px; max-width: 95vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Edit Saved Style</div>
          <q-space />
          <q-btn flat dense round icon="close" :disable="savingEdit" @click="editDialogOpen = false" />
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="editName"
            outlined
            label="Name"
            class="q-mb-sm"
            :error="Boolean(editError)"
            :error-message="editError"
          />
          <q-select
            v-model="editCategory"
            :options="categoryOptions"
            outlined
            use-input
            fill-input
            hide-selected
            new-value-mode="add-unique"
            label="Category"
            class="q-mb-sm"
          />
          <q-input
            v-model="editPrompt"
            outlined
            type="textarea"
            autogrow
            label="Style Prompt"
          />
        </q-card-section>
        <q-card-actions align="between">
          <q-btn flat color="negative" icon="delete_outline" label="Delete" :disable="savingEdit" @click="deleteConfirmOpen = true" />
          <div class="row q-gutter-sm">
            <q-btn flat label="Cancel" :disable="savingEdit" @click="editDialogOpen = false" />
            <q-btn color="primary" icon="save" label="Save" :loading="savingEdit" @click="saveStyleEdits" />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteConfirmOpen" persistent>
      <q-card style="min-width: 420px; max-width: 90vw;">
        <q-card-section class="text-h6">Delete Saved Style</q-card-section>
        <q-card-section class="text-body2 text-grey-8">
          Delete <strong>{{ editingStyle?.name }}</strong> from <strong>{{ editingStyle?.category }}</strong>?
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="deleteConfirmOpen = false" />
          <q-btn color="negative" icon="delete" label="Delete" :loading="savingEdit" @click="deleteStyle" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import sampleImage from '../assets/sample-image.svg';
import {
  deleteSavedStyle,
  listSavedStyles,
  resolveApiAssetUrl,
  updateSavedStyle,
} from '../api/jobs.js';

const props = defineProps({
  active: { type: Boolean, default: false },
  refreshToken: { type: Number, default: 0 },
});

const emit = defineEmits(['add-to-prompt']);
const selectedStyle = ref(null);
const confirmDialogOpen = ref(false);
const filterText = ref('');
const loading = ref(false);
const error = ref('');
const sections = ref([]);
const categoryOptions = ref([]);

const editDialogOpen = ref(false);
const deleteConfirmOpen = ref(false);
const editingStyle = ref(null);
const editName = ref('');
const editCategory = ref('');
const editPrompt = ref('');
const editError = ref('');
const savingEdit = ref(false);

const imageModules = import.meta.glob('../assets/images/*.{png,jpg,jpeg,webp,gif,avif}', {
  eager: true,
  import: 'default',
});

const imageLookup = new Map();

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function registerImageKey(key, value) {
  if (!key) return;
  if (!imageLookup.has(key)) imageLookup.set(key, value);
}

for (const [modulePath, url] of Object.entries(imageModules)) {
  const fileName = modulePath.split('/').pop() || '';
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const normalizedBase = normalizeName(baseName);

  registerImageKey(baseName, url);
  registerImageKey(baseName.toLowerCase(), url);
  registerImageKey(normalizedBase, url);
  registerImageKey(normalizedBase.replace(/-/g, '_'), url);
  registerImageKey(normalizedBase.replace(/-/g, ' '), url);
}

function resolveStyleImage(item) {
  const imagePath = String(item?.imagePath || '').trim();
  if (imagePath) {
    return resolveApiAssetUrl(imagePath);
  }

  const name = String(item?.name || '');
  const normalized = normalizeName(name);
  const candidates = [
    name,
    name.toLowerCase(),
    normalized,
    normalized.replace(/-/g, '_'),
    normalized.replace(/-/g, ' '),
  ];

  for (const candidate of candidates) {
    if (candidate && imageLookup.has(candidate)) {
      return imageLookup.get(candidate);
    }
  }

  return sampleImage;
}

async function loadSavedStyles() {
  loading.value = true;
  error.value = '';
  try {
    const response = await listSavedStyles();
    sections.value = Array.isArray(response?.sections) ? response.sections : [];
    categoryOptions.value = Array.isArray(response?.categories) ? response.categories : [];
    syncExpandedState();
  } catch (e) {
    error.value = e.message || 'Failed to load saved styles';
    sections.value = [];
    categoryOptions.value = [];
  } finally {
    loading.value = false;
  }
}

function syncExpandedState() {
  const next = {};
  sections.value.forEach((section) => {
    next[section.title] = Boolean(expandedState.value[section.title]);
  });
  expandedState.value = next;
}

function openStyleDialog(item) {
  selectedStyle.value = item;
  confirmDialogOpen.value = true;
}

function confirmAddToPrompt() {
  if (selectedStyle.value) {
    emit('add-to-prompt', selectedStyle.value);
  }
  confirmDialogOpen.value = false;
  selectedStyle.value = null;
}

function openEditDialog(item) {
  editingStyle.value = item;
  editName.value = String(item?.name || '');
  editCategory.value = String(item?.category || '');
  editPrompt.value = String(item?.prompt || '');
  editError.value = '';
  editDialogOpen.value = true;
}

async function saveStyleEdits() {
  const style = editingStyle.value;
  if (!style) return;

  const name = String(editName.value || '').trim();
  const category = String(editCategory.value || '').trim();
  if (!name || !category) {
    editError.value = 'Name and category are required.';
    return;
  }

  savingEdit.value = true;
  editError.value = '';
  try {
    await updateSavedStyle({
      original: {
        name: style.name,
        category: style.category,
        isUserStyle: Boolean(style.isUserStyle),
      },
      next: {
        name,
        category,
        prompt: String(editPrompt.value || '').trim(),
        styles: style.styles || {},
        imageLocalPath: style.imagePath || null,
      },
    });
    editDialogOpen.value = false;
    await loadSavedStyles();
  } catch (e) {
    editError.value = e.message || 'Failed to save changes';
  } finally {
    savingEdit.value = false;
  }
}

async function deleteStyle() {
  const style = editingStyle.value;
  if (!style) return;

  savingEdit.value = true;
  editError.value = '';
  try {
    await deleteSavedStyle({
      name: style.name,
      category: style.category,
      isUserStyle: Boolean(style.isUserStyle),
    });
    deleteConfirmOpen.value = false;
    editDialogOpen.value = false;
    await loadSavedStyles();
  } catch (e) {
    editError.value = e.message || 'Failed to delete style';
  } finally {
    savingEdit.value = false;
  }
}

const filteredSections = computed(() => {
  const query = String(filterText.value || '').trim().toLowerCase();
  if (!query) return sections.value;

  const out = [];
  for (const section of sections.value) {
    const categoryMatch = section.title.toLowerCase().includes(query);
    if (categoryMatch) {
      out.push(section);
      continue;
    }

    const matchedItems = (section.items || []).filter((item) =>
      String(item.name || '').toLowerCase().includes(query)
    );

    if (matchedItems.length) {
      out.push({
        ...section,
        items: matchedItems,
      });
    }
  }

  return out;
});

const expandedState = ref({});

function expandAll() {
  const next = {};
  filteredSections.value.forEach((section) => {
    next[section.title] = true;
  });
  expandedState.value = {
    ...expandedState.value,
    ...next,
  };
}

function collapseAll() {
  const next = {};
  filteredSections.value.forEach((section) => {
    next[section.title] = false;
  });
  expandedState.value = {
    ...expandedState.value,
    ...next,
  };
}

function onSectionToggle(title, isOpen) {
  if (!isOpen) {
    expandedState.value = {
      ...expandedState.value,
      [title]: false,
    };
    return;
  }

  const next = {};
  sections.value.forEach((section) => {
    next[section.title] = section.title === title;
  });
  expandedState.value = next;
}

onMounted(loadSavedStyles);

watch(
  () => props.active,
  (isActive) => {
    if (isActive) loadSavedStyles();
  }
);

watch(
  () => props.refreshToken,
  () => {
    if (props.active) loadSavedStyles();
  }
);
</script>

<style scoped>
.saved-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.saved-style-card {
  overflow: hidden;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  position: relative;
}

.saved-style-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
}

.style-edit-btn {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.24);
}

.saved-style-name {
  font-weight: 600;
  line-height: 1.35;
}

.saved-style-image {
  height: 350px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: #f4f7fb;
}

.saved-style-prompt {
  line-height: 1.45;
  white-space: pre-wrap;
}

@media (max-width: 559px) {
  .saved-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 900px) {
  .saved-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .saved-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (min-width: 1600px) {
  .saved-grid {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
}
</style>
