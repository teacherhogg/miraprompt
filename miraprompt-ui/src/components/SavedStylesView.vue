<template>
  <div>
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6">Saved Styles</div>
        <div class="text-body2 text-grey-7 q-mt-sm">
          Browse curated style prompts grouped by section.
        </div>
      </q-card-section>
    </q-card>

    <q-card
      v-for="section in sections"
      :key="section.title"
      flat
      bordered
      class="q-mb-md"
    >
      <q-card-section class="saved-section-header row items-center justify-between q-gutter-sm">
        <div class="text-subtitle1">{{ section.title }}</div>
        <q-chip dense color="white" text-color="primary" size="sm">
          {{ section.items.length }} style{{ section.items.length !== 1 ? 's' : '' }}
        </q-chip>
      </q-card-section>
      <q-separator />

      <q-card-section>
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
      </q-card-section>
    </q-card>

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
import { ref } from 'vue';
import savedStyles from '../assets/saved-styles.json';
import sampleImage from '../assets/sample-image.svg';

const emit = defineEmits(['add-to-prompt']);
const selectedStyle = ref(null);
const confirmDialogOpen = ref(false);

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
</script>

<style scoped>
.saved-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.saved-section-header {
  background: var(--q-primary);
  color: white;
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
