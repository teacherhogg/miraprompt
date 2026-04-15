<template>
  <div>
    <q-card flat bordered>
      <q-card-section class="row items-center justify-between">
        <div>
          <div class="text-h6">Images Library</div>
          <div class="text-caption text-grey-7">
            Browse all previously generated images by category and subcategory.
          </div>
        </div>
        <q-btn flat dense round icon="refresh" :loading="loading" @click="loadImages">
          <q-tooltip>Refresh images</q-tooltip>
        </q-btn>
      </q-card-section>
      <q-separator />

      <q-card-section>
        <div v-if="loading" class="flex flex-center q-pa-lg">
          <q-spinner size="40px" />
        </div>

        <q-banner v-else-if="error" rounded class="bg-negative text-white q-mb-md">
          {{ error }}
        </q-banner>

        <q-banner v-else-if="!images.length" rounded class="bg-grey-2 text-grey-8">
          No generated images yet. Run a job to populate this view.
        </q-banner>

        <template v-else>
          <div class="text-subtitle2 q-mb-sm">Category</div>
          <div style="overflow:auto" class="q-mb-md">
            <q-btn-toggle
              v-model="selectedCategory"
              no-caps
              unelevated
              toggle-color="primary"
              color="grey-3"
              text-color="grey-8"
              :options="categoryOptions"
            />
          </div>

          <div v-for="group in groupedBySubcategory" :key="group.subcategory" class="q-mb-md">
            <q-card flat bordered>
              <q-card-section class="row items-center justify-between">
                <div class="text-subtitle1">{{ group.subcategory }}</div>
                <q-chip dense color="grey-3" text-color="grey-8" size="sm">
                  {{ group.images.length }} image{{ group.images.length !== 1 ? 's' : '' }}
                </q-chip>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <div class="job-image-grid">
                  <div
                    v-for="img in group.images"
                    :key="`${img.jobSlug}-${img.promptId}-${img.createdAt}`"
                    class="job-image-card generated-grid-item"
                    @click="lightboxImage = img"
                  >
                    <q-img
                      :src="img.imageUrl || img.publicLocalPath"
                      ratio="1"
                      fit="contain"
                      class="rounded-borders"
                    />
                    <div class="text-caption text-grey-6 q-mt-xs">
                      {{ img.createdAt ? new Date(img.createdAt).toLocaleString() : 'Unknown date' }}
                    </div>
                    <div class="text-caption text-grey-7">
                      {{ img.jobName || img.jobSlug }}
                    </div>
                    <div class="style-chips-row q-mt-xs">
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
          </div>
        </template>
      </q-card-section>
    </q-card>

    <q-dialog v-model="lightboxOpen" maximized>
      <q-card class="column" style="max-width:900px; margin:auto; height:100%">
        <q-card-section class="row items-center justify-between q-pb-none">
          <div class="text-h6">{{ lightboxImage?.subcategory || 'Image' }}</div>
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
          <q-banner v-if="lightboxExecutionChips.length" rounded class="bg-blue-1 text-blue-10 q-mt-md">
            <div class="text-subtitle2">Execution Settings</div>
            <div class="q-mt-xs" style="display:flex; flex-wrap:wrap; gap:6px;">
              <q-chip
                v-for="chip in lightboxExecutionChips"
                :key="`img-lightbox-${chip}`"
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
          <q-btn
            color="primary"
            icon="bookmark_add"
            label="Make Saved Style"
            :disable="!lightboxImage?.styles || !Object.keys(lightboxImage.styles).length"
            @click="openMakeSavedStyleDialog"
          />
          <q-btn
            color="secondary"
            icon="check"
            label="Add Styles to Prompt"
            :disable="!lightboxImage?.styles || !Object.keys(lightboxImage.styles).length"
            @click="applyImageStyles(lightboxImage)"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="makeSavedStyleOpen" persistent>
      <q-card style="min-width: 520px; max-width: 94vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Make Saved Style</div>
          <q-space />
          <q-btn flat dense round icon="close" :disable="savingSavedStyle" @click="makeSavedStyleOpen = false" />
        </q-card-section>
        <q-card-section>
          <div class="text-body2 text-grey-7 q-mb-sm">
            Create a saved style from this image's styles.
          </div>
          <q-input
            v-model="newSavedStyleName"
            label="Saved style name"
            outlined
            autofocus
            class="q-mb-sm"
            :error="Boolean(makeSavedStyleError)"
            :error-message="makeSavedStyleError"
          />
          <q-select
            v-model="newSavedStyleCategory"
            :options="savedStyleCategoryOptions"
            label="Category (choose existing or type new)"
            outlined
            use-input
            fill-input
            hide-selected
            new-value-mode="add-unique"
            class="q-mb-sm"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" :disable="savingSavedStyle" @click="makeSavedStyleOpen = false" />
          <q-btn
            color="primary"
            icon="save"
            label="Save Style"
            :loading="savingSavedStyle"
            :disable="!newSavedStyleName.trim() || !newSavedStyleCategory.trim()"
            @click="saveAsSavedStyle"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import styleData from '../assets/custom-styles.json';
import { createSavedStyle, listGeneratedImages, listSavedStyles } from '../api/jobs.js';
import { getStyleChips } from '../utils/style-data.js';

const props = defineProps({
  active: { type: Boolean, default: false },
  refreshToken: { type: Number, default: 0 },
});

const emit = defineEmits(['apply-styles', 'saved-style-created']);

const loading = ref(false);
const error = ref('');
const images = ref([]);
const selectedCategory = ref(null);
const lightboxImage = ref(null);
const makeSavedStyleOpen = ref(false);
const savingSavedStyle = ref(false);
const makeSavedStyleError = ref('');
const newSavedStyleName = ref('');
const newSavedStyleCategory = ref('');
const savedStyleCategoryOptions = ref([]);

const lightboxOpen = computed({
  get: () => lightboxImage.value !== null,
  set: (v) => { if (!v) lightboxImage.value = null; },
});

const lightboxExecutionChips = computed(() => {
  const execution = lightboxImage.value?.execution;
  if (!execution) return [];

  const chips = [];
  chips.push(`provider: ${execution.provider || '—'}`);
  chips.push(`model: ${execution.model || '—'}`);

  const settings = execution.settings || {};
  Object.keys(settings)
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      const value = settings[key];
      if (value === null || value === undefined || value === '') {
        chips.push(`${key}: —`);
        return;
      }
      if (key === 'input_url' || key === 'characterReferenceUrl' || key === 'reference_image_url') {
        chips.push(`${key}: [${String(value).length} chars]`);
        return;
      }
      chips.push(`${key}: ${String(value)}`);
    });

  return chips;
});

const categoryCounts = computed(() => {
  const counts = {};
  for (const img of images.value) {
    const category = img.category || 'Uncategorized';
    counts[category] = (counts[category] || 0) + 1;
  }
  return counts;
});

const categoryOptions = computed(() =>
  Object.keys(categoryCounts.value)
    .sort((a, b) => a.localeCompare(b))
    .map((category) => ({
      label: `${category} (${categoryCounts.value[category]})`,
      value: category,
    }))
);

const filteredImages = computed(() => {
  if (!selectedCategory.value) return [];
  return images.value.filter((img) => (img.category || 'Uncategorized') === selectedCategory.value);
});

const groupedBySubcategory = computed(() => {
  const groups = {};
  for (const img of filteredImages.value) {
    const subcategory = img.subcategory || 'No subcategory';
    if (!groups[subcategory]) groups[subcategory] = [];
    groups[subcategory].push(img);
  }

  return Object.keys(groups)
    .sort((a, b) => a.localeCompare(b))
    .map((subcategory) => ({
      subcategory,
      images: groups[subcategory].sort(
        (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      ),
    }));
});

function getImageChips(img) {
  return getStyleChips(styleData, img.category, img.subcategory, img.styles || {});
}

function applyImageStyles(img) {
  if (!img?.styles || !Object.keys(img.styles).length) return;
  emit('apply-styles', img);
  lightboxImage.value = null;
}

async function openMakeSavedStyleDialog() {
  makeSavedStyleError.value = '';
  const img = lightboxImage.value;
  if (!img) return;

  newSavedStyleName.value = String(img.subcategory || img.category || 'New Style').trim();
  newSavedStyleCategory.value = String(img.category || '').trim();

  try {
    const response = await listSavedStyles();
    savedStyleCategoryOptions.value = Array.isArray(response?.categories)
      ? [...response.categories]
      : [];
  } catch {
    savedStyleCategoryOptions.value = [];
  }

  makeSavedStyleOpen.value = true;
}

async function saveAsSavedStyle() {
  const img = lightboxImage.value;
  if (!img?.styles || !Object.keys(img.styles).length) return;

  const name = String(newSavedStyleName.value || '').trim();
  const category = String(newSavedStyleCategory.value || '').trim();
  if (!name || !category) return;

  savingSavedStyle.value = true;
  makeSavedStyleError.value = '';

  try {
    const localPath = String(img.localFilePath || img.publicLocalPath || '').replace(/^\//, '');
    await createSavedStyle({
      name,
      category,
      styles: img.styles || {},
      imageLocalPath: localPath || null,
      imageUrl: img.imageUrl || null,
    });
    makeSavedStyleOpen.value = false;
    emit('saved-style-created');
  } catch (e) {
    makeSavedStyleError.value = e.message || 'Failed to create saved style';
  } finally {
    savingSavedStyle.value = false;
  }
}

async function loadImages() {
  loading.value = true;
  error.value = '';
  try {
    images.value = await listGeneratedImages();
    if (!selectedCategory.value || !categoryCounts.value[selectedCategory.value]) {
      selectedCategory.value = Object.keys(categoryCounts.value).sort((a, b) => a.localeCompare(b))[0] || null;
    }
  } catch (e) {
    error.value = e.message || 'Failed to load generated images';
  } finally {
    loading.value = false;
  }
}

onMounted(loadImages);

watch(
  () => props.active,
  (isActive) => {
    if (isActive) loadImages();
  }
);

watch(
  () => props.refreshToken,
  () => {
    if (props.active) loadImages();
  }
);
</script>
