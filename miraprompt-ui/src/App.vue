<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="miraprompt-page">

        <!-- ── top header bar ───────────────────────────────────────── -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="row items-center justify-between">
            <div class="header-brand">
              <div class="header-logo-wrap">
                <img :src="mirapromptLogo" alt="MiraPrompt logo" class="header-logo" />
              </div>
              <div class="header-brand-copy">
                <div class="text-h4">MiraPrompt</div>
                <div class="text-subtitle2 text-grey-8">
                Build image-generation prompts from categories, subcategories, and style options.
                </div>
              </div>
            </div>
            <q-btn
              v-if="activeTab === 'prompt'"
              flat dense round
              icon="view_sidebar"
              :color="panelOpen ? 'primary' : 'grey-7'"
              @click="panelOpen = !panelOpen"
            >
              <q-tooltip>{{ panelOpen ? 'Hide image panel' : 'Show image panel' }}</q-tooltip>
            </q-btn>
          </q-card-section>
        </q-card>

        <!-- ── tabs ─────────────────────────────────────────────────── -->
        <q-tabs v-model="activeTab" dense align="left" class="q-mb-md text-grey-8" active-color="primary" indicator-color="primary">
          <q-tab name="images" icon="photo_library" label="Images" @click="imagesRefreshToken += 1" />
          <q-tab name="prompt" icon="tune" label="Prompt" />
          <q-tab name="models" icon="tune" label="Models" @click="modelsRefreshToken += 1" />
          <q-tab name="jobs" icon="work_outline" label="Jobs" @click="jobsRefreshToken += 1" />
        </q-tabs>

        <q-tab-panels v-model="activeTab" animated keep-alive>

          <!-- ══ IMAGES TAB ═══════════════════════════════════════════ -->
          <q-tab-panel name="images" class="q-pa-none">
            <ImagesView :active="activeTab === 'images'" :refresh-token="imagesRefreshToken" />
          </q-tab-panel>

          <!-- ══ JOBS TAB ══════════════════════════════════════════════ -->
          <q-tab-panel name="jobs" class="q-pa-none">
            <JobsView :active="activeTab === 'jobs'" :refresh-token="jobsRefreshToken" />
          </q-tab-panel>

          <!-- ══ MODELS TAB ═══════════════════════════════════════════ -->
          <q-tab-panel name="models" class="q-pa-none">
            <ModelsView :active="activeTab === 'models'" :refresh-token="modelsRefreshToken" />
          </q-tab-panel>

          <!-- ══ PROMPT TAB ════════════════════════════════════════════ -->
          <q-tab-panel name="prompt" class="q-pa-none">

        <!-- ── main two-column layout ───────────────────────────────── -->
        <div class="row q-col-gutter-md">

          <!-- left / main column -->
          <div :class="panelOpen ? 'col-12 col-lg-8' : 'col-12'">

            <!-- category / subcategory -->
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-md-6">
                    <q-select
                      v-model="selectedCategory"
                      :options="categoryOptions"
                      label="Category"
                      outlined dense emit-value map-options
                    />
                  </div>
                  <div class="col-12 col-md-6">
                    <q-select
                      v-model="selectedSubcategory"
                      :options="subcategoryOptions"
                      label="Subcategory"
                      outlined dense emit-value map-options
                      :disable="!selectedCategory"
                    />
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <!-- styles accordion -->
            <q-banner
              v-if="!selectedCategory || !selectedSubcategory"
              rounded
              class="bg-grey-2 text-grey-8 q-mb-md"
            >
              Select both a category and a subcategory to view style options.
            </q-banner>
            <q-card v-if="selectedCategory && selectedSubcategory" flat bordered class="q-mb-md">
              <q-card-section class="row items-center justify-between q-gutter-sm">
                <div class="text-h6">Styles</div>
                <div class="row q-gutter-sm items-center">
                  <q-btn flat dense round icon="unfold_more" @click="expandAll">
                    <q-tooltip>Expand all sections</q-tooltip>
                  </q-btn>
                  <q-btn flat dense round icon="unfold_less" @click="collapseAll">
                    <q-tooltip>Collapse all sections</q-tooltip>
                  </q-btn>
                  <q-btn label="Clear" flat color="negative" @click="clearSelections" />
                  <q-btn label="Add to Job" color="secondary" outline icon="playlist_add" @click="showAddToJob = true" />
                </div>
              </q-card-section>

              <q-separator />

              <q-card-section>
                <q-banner v-if="!selectedCategory" rounded class="bg-grey-2 text-grey-8 q-mb-md">
                  Select a category first. Subcategory and merged style options will update automatically.
                </q-banner>
                <q-banner v-else rounded class="bg-grey-1 text-grey-8 q-mb-md">
                  <span class="scope-legend global">Global</span>
                  <span class="scope-legend category q-ml-sm">Category</span>
                  <span class="scope-legend subcategory q-ml-sm">Subcategory</span>
                </q-banner>

                <q-list bordered separator>
                  <q-expansion-item
                    v-for="dimension in dimensions"
                    :key="dimension"
                    v-model="expandedState[dimension]"
                    :label="toTitle(dimension)"
                    :caption="dimensionCountLabel(dimension)"
                    expand-separator
                  >
                    <q-card flat>
                      <q-card-section class="q-pt-sm">
                        <div
                          v-for="(groupName, idx) in orderedGroupNames(dimension)"
                          :key="`${dimension}-${groupName}`"
                          :class="['group-row', idx % 2 === 0 ? 'alt-a' : 'alt-b']"
                        >
                          <div class="text-subtitle2">{{ toTitle(groupName) }}</div>
                          <div class="option-wrap">
                            <q-checkbox
                              v-for="option in mergedStyles[dimension][groupName]"
                              :key="`${dimension}-${groupName}-${option}`"
                              :class="['option-chip', optionScopeClass(dimension, groupName, option)]"
                              dense
                              :model-value="isSelected(dimension, groupName, option)"
                              :label="option"
                              @update:model-value="(val) => toggleSelection(dimension, groupName, option, val)"
                            />
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
                </q-list>
              </q-card-section>
            </q-card>

            <!-- description -->
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-h6">Description</div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <q-input
                  v-model="description"
                  type="textarea"
                  outlined autogrow
                  placeholder="Add a description for this prompt..."
                />
              </q-card-section>
            </q-card>

            <!-- selection summary -->
            <q-card v-if="hasSummary" flat bordered class="q-mb-md">
              <q-card-section class="row items-center justify-between q-gutter-sm">
                <div class="text-h6">Selection Summary</div>
                <q-btn
                  label="Add To Job"
                  color="secondary"
                  outline
                  icon="playlist_add"
                  @click="showAddToJob = true"
                />
              </q-card-section>
              <q-separator />
              <q-card-section class="q-pt-sm">
                <div v-for="(values, dim) in selectionSummary" :key="dim" class="summary-row">
                  <span class="summary-dim">{{ toTitle(dim) }}:</span>
                  <span class="summary-vals">{{ values.join(', ') }}</span>
                </div>
              </q-card-section>
            </q-card>

          </div><!-- /left column -->

          <!-- right panel -->
          <div v-if="panelOpen" class="col-12 col-lg-4">
            <q-card flat bordered class="panel-card">
              <q-card-section class="row items-center justify-between">
                <div class="text-h6">Images</div>
                <q-chip v-if="selectedSubcategory" dense color="primary" text-color="white" size="sm">
                  {{ selectedSubcategory }}
                </q-chip>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <div v-if="!selectedSubcategory" class="text-grey-6 text-caption q-pa-sm">
                  Select a subcategory to browse related images.
                </div>
                <div v-else>
                  <div v-if="generatedImagesLoading" class="flex flex-center q-pa-md">
                    <q-spinner size="32px" />
                  </div>
                  <template v-else-if="generatedImages.length">
                    <div class="generated-grid">
                      <div
                        v-for="img in generatedImages"
                        :key="`${img.jobSlug}-${img.promptId}-${img.createdAt}`"
                        class="generated-grid-item"
                        @click="lightboxImage = img"
                      >
                        <q-img
                          :src="img.imageUrl || img.publicLocalPath || sampleImage"
                          ratio="1"
                          class="rounded-borders"
                        />
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
                    <div class="text-caption text-grey-6 q-mt-sm">
                      Showing {{ generatedImages.length }} previously generated image(s) for
                      <em>{{ selectedSubcategory }}</em>.
                    </div>
                  </template>
                  <template v-else>
                    <q-img
                      :src="sampleImage"
                      ratio="1.33"
                      class="rounded-borders"
                      style="width:100%"
                    >
                      <template #error>
                        <div class="absolute-full flex flex-center bg-grey-3 text-grey-7 text-caption">
                          Image unavailable
                        </div>
                      </template>
                    </q-img>
                    <div class="text-caption text-grey-6 q-mt-sm">
                      No saved images for <em>{{ selectedSubcategory }}</em> yet.
                    </div>
                  </template>
                </div>
              </q-card-section>
            </q-card>
          </div><!-- /right panel -->

        </div><!-- /row -->

        <!-- dialogs -->
        <AddToJobDialog v-model="showAddToJob" :prompt-payload="selectedPayload" />

        <!-- image lightbox -->
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
                :src="lightboxImage.imageUrl || lightboxImage.publicLocalPath || sampleImage"
                fit="contain"
                style="max-height:60vh; width:100%; object-fit:contain"
                class="rounded-borders"
              />
              <q-banner v-if="lightboxImage" rounded class="bg-grey-2 text-grey-8 q-mt-md">
                <div class="text-subtitle2">Prompt</div>
                <div class="text-body2 q-mt-xs">{{ lightboxPromptText(lightboxImage) }}</div>
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
              <q-btn flat label="Cancel" @click="lightboxImage = null" />
              <q-btn
                color="secondary"
                icon="check"
                label="Add These Styles"
                :disable="!lightboxImage?.styles || !Object.keys(lightboxImage.styles).length"
                @click="applyImageStyles(lightboxImage)"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>

          </q-tab-panel><!-- /prompt tab -->

        </q-tab-panels>

      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import styleData from './assets/image-styles.json';
import mirapromptLogo from './assets/miraprompt.png';
import sampleImage from './assets/sample-image.svg';
import { buildMergedStylesWithScopes, orderedDimensions, getStyleChips, SCOPE_PRIORITY } from './utils/style-data';
import { listGeneratedImages } from './api/jobs.js';
import AddToJobDialog from './components/AddToJobDialog.vue';
import ImagesView from './components/ImagesView.vue';
import JobsView from './components/JobsView.vue';
import ModelsView from './components/ModelsView.vue';

// ── reactive state ───────────────────────────────────────────────────────────
const selectedCategory = ref(null);
const selectedSubcategory = ref(null);
const activeTab = ref('images');
const imagesRefreshToken = ref(0);
const jobsRefreshToken = ref(0);
const modelsRefreshToken = ref(0);
const showAddToJob = ref(false);
const lightboxImage = ref(null);
const panelOpen = ref(true);
const generatedImages = ref([]);
const generatedImagesLoading = ref(false);
const selectedMap = ref({});
const description = ref('');
const expandedState = ref({});

// ── derived data (must be declared before any watcher that references them) ──
const categoryOptions = computed(() =>
  Object.keys(styleData.categories)
    .sort((a, b) => a.localeCompare(b))
    .map((cat) => ({ label: cat, value: cat }))
);

const subcategoryOptions = computed(() => {
  if (!selectedCategory.value) return [];
  const sub = styleData.categories[selectedCategory.value] || [];
  return [...new Set(sub)]
    .sort((a, b) => a.localeCompare(b))
    .map((item) => ({ label: item, value: item }));
});

const mergedBundle = computed(() =>
  buildMergedStylesWithScopes(styleData, selectedCategory.value, selectedSubcategory.value)
);

const mergedStyles = computed(() => mergedBundle.value.merged);
const styleScopes = computed(() => mergedBundle.value.scopeMap);

// Group-level scope: highest-priority scope of any option in that group
const groupScopeMap = computed(() => {
  const scopes = styleScopes.value;
  const result = {};
  for (const [dim, groups] of Object.entries(scopes || {})) {
    result[dim] = {};
    for (const [groupName, options] of Object.entries(groups || {})) {
      let max = 1;
      let maxScope = 'global';
      for (const s of Object.values(options || {})) {
        if ((SCOPE_PRIORITY[s] || 1) > max) { max = SCOPE_PRIORITY[s]; maxScope = s; }
      }
      result[dim][groupName] = maxScope;
    }
  }
  return result;
});

const dimensions = computed(() => orderedDimensions(mergedStyles.value));

const selectedPayload = computed(() => {
  const payload = {
    category: selectedCategory.value,
    subcategory: selectedSubcategory.value,
    description: description.value,
    styles: {}
  };

  Object.keys(selectedMap.value).forEach((k) => {
    const [dimension, groupName, option] = k.split('|||');
    if (!payload.styles[dimension]) payload.styles[dimension] = {};
    if (!payload.styles[dimension][groupName]) payload.styles[dimension][groupName] = [];
    payload.styles[dimension][groupName].push(option);
  });

  Object.keys(payload.styles).forEach((dimension) => {
    Object.keys(payload.styles[dimension]).forEach((groupName) => {
      payload.styles[dimension][groupName].sort((a, b) => a.localeCompare(b));
    });
  });

  return payload;
});

const jsonPreview = computed(() => JSON.stringify(selectedPayload.value, null, 2));

// ── selection summary (flat list of chosen values per dimension) ─────────────
const selectionSummary = computed(() => {
  const raw = selectedPayload.value.styles;
  const result = {};
  orderedDimensions(raw).forEach((dim) => {
    const all = Object.values(raw[dim] || {}).flat();
    if (all.length) result[dim] = all;
  });
  return result;
});

const hasSummary = computed(() => Object.keys(selectionSummary.value).length > 0);

const lightboxOpen = computed({
  get: () => lightboxImage.value !== null,
  set: (v) => { if (!v) lightboxImage.value = null; },
});

// ── watchers (after all referenced computeds are declared) ───────────────────
watch(selectedCategory, () => {
  selectedSubcategory.value = null;
  selectedMap.value = {};
});

watch(selectedSubcategory, () => {
  selectedMap.value = {};
  refreshGeneratedImages();
});

watch(selectedCategory, () => {
  generatedImages.value = [];
});

watch(
  dimensions,
  (newDims) => {
    const state = {};
    newDims.forEach((d) => { state[d] = true; });
    expandedState.value = state;
  },
  { immediate: true }
);

// ── functions ────────────────────────────────────────────────────────────────
function expandAll() {
  dimensions.value.forEach((d) => { expandedState.value[d] = true; });
}

function collapseAll() {
  dimensions.value.forEach((d) => { expandedState.value[d] = false; });
}

function keyFor(dimension, groupName, option) {
  return `${dimension}|||${groupName}|||${option}`;
}

function isSelected(dimension, groupName, option) {
  return Boolean(selectedMap.value[keyFor(dimension, groupName, option)]);
}

function toggleSelection(dimension, groupName, option, value) {
  const key = keyFor(dimension, groupName, option);
  if (value) {
    selectedMap.value[key] = true;
  } else {
    delete selectedMap.value[key];
  }
}

function clearSelections() {
  selectedMap.value = {};
}

function toTitle(text) {
  return String(text)
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function dimensionCountLabel(dimension) {
  const selDim = selectedPayload.value.styles?.[dimension] || {};
  const selectedCount = Object.values(selDim).reduce((acc, list) => acc + list.length, 0);
  const totalCount = Object.values(mergedStyles.value?.[dimension] || {}).reduce(
    (acc, list) => acc + list.length,
    0
  );
  return `${selectedCount}/${totalCount} selected`;
}

function optionScopeClass(dimension, groupName, option) {
  const scope = styleScopes.value?.[dimension]?.[groupName]?.[option] || 'global';
  return `scope-${scope}`;
}

// Returns group names sorted subcategory-first, category, then global
function orderedGroupNames(dimension) {
  const groups = Object.keys(mergedStyles.value[dimension] || {});
  return groups.sort((a, b) => {
    const pa = SCOPE_PRIORITY[groupScopeMap.value[dimension]?.[a]] || 1;
    const pb = SCOPE_PRIORITY[groupScopeMap.value[dimension]?.[b]] || 1;
    return pb - pa;
  });
}

function applyImageStyles(img) {
  if (!img?.styles) return;
  for (const [dimension, groups] of Object.entries(img.styles)) {
    for (const [groupName, options] of Object.entries(groups || {})) {
      for (const option of (options || [])) {
        selectedMap.value[keyFor(dimension, groupName, option)] = true;
      }
    }
  }
  lightboxImage.value = null;
}

async function refreshGeneratedImages() {
  if (!selectedSubcategory.value) {
    generatedImages.value = [];
    return;
  }

  generatedImagesLoading.value = true;
  try {
    generatedImages.value = await listGeneratedImages(selectedSubcategory.value);
  } catch {
    generatedImages.value = [];
  } finally {
    generatedImagesLoading.value = false;
  }
}

function getImageChips(img) {
  return getStyleChips(styleData, img.category, img.subcategory, img.styles || {});
}

function lightboxPromptText(img) {
  return img?.transformedPrompt || img?.description || 'No prompt text available for this image.';
}
</script>
