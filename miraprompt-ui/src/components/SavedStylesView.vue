<template>
  <div>
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row items-center justify-between q-gutter-sm">
        <div>
          <div class="text-h6">Saved Styles</div>
          <div class="text-body2 text-grey-7 q-mt-sm">
            Browse curated style prompts grouped by section.
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
          <q-btn
            label="Expand All"
            icon="unfold_more"
            color="primary"
            outline
            no-caps
            @click="expandAll"
          />
          <q-btn
            label="Collapse All"
            icon="unfold_less"
            color="primary"
            outline
            no-caps
            @click="collapseAll"
          />
        </div>
      </q-card-section>
    </q-card>

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
              <q-card-section class="q-pb-sm">
                <div class="text-subtitle2 saved-style-name">{{ item.name }}</div>
              </q-card-section>

              <q-img
                :src="resolveStyleImage(item.name)"
                :alt="item.name"
                fit="contain"
                class="saved-style-image"
              >
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
    <q-banner v-if="!filteredSections.length" rounded class="bg-grey-2 text-grey-8 q-mt-md">
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
          <q-btn
            color="secondary"
            icon="add"
            label="Add to Prompt"
            @click="confirmAddToPrompt"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import savedStyles from '../assets/saved-styles.json';
import sampleImage from '../assets/sample-image.svg';

const emit = defineEmits(['add-to-prompt']);
const selectedStyle = ref(null);
const confirmDialogOpen = ref(false);
const filterText = ref('');

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

for (const [path, url] of Object.entries(imageModules)) {
  const fileName = path.split('/').pop() || '';
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const normalizedBase = normalizeName(baseName);

  registerImageKey(baseName, url);
  registerImageKey(baseName.toLowerCase(), url);
  registerImageKey(normalizedBase, url);
  registerImageKey(normalizedBase.replace(/-/g, '_'), url);
  registerImageKey(normalizedBase.replace(/-/g, ' '), url);
}

function resolveStyleImage(name) {
  const normalized = normalizeName(name);
  const candidates = [
    name,
    String(name || '').toLowerCase(),
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

const sections = Object.entries(savedStyles)
  .map(([title, items]) => ({
    title,
    items: Array.isArray(items)
      ? items
        .filter((item) => item && item.name && item.prompt)
        .map((item) => ({
          ...item,
          category: title,
        }))
      : [],
  }))
  .filter((section) => section.items.length > 0);

const filteredSections = computed(() => {
  const query = String(filterText.value || '').trim().toLowerCase();
  if (!query) return sections;

  const out = [];
  for (const section of sections) {
    const categoryMatch = section.title.toLowerCase().includes(query);
    if (categoryMatch) {
      out.push(section);
      continue;
    }

    const matchedItems = section.items.filter((item) =>
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

const expandedState = ref(
  Object.fromEntries(sections.map((section) => [section.title, false]))
);

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
  sections.forEach((section) => {
    next[section.title] = section.title === title;
  });
  expandedState.value = next;
}
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
}

.saved-style-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
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
