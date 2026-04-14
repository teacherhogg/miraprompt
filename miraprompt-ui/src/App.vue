<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="miraprompt-page">

        <!-- ── top header bar ───────────────────────────────────────── -->
        <q-card flat bordered class="q-mb-md bg-transparent">
          <q-card-section class="row items-center justify-between">
            <div class="header-brand">
              <div class="header-logo-wrap">
                <img :src="mirapromptLogo" alt="MiraPrompt logo" class="header-logo" />
              </div>
              <div class="header-brand-copy">
                <div class="text-h4">MiraPrompt</div>
                <div class="text-subtitle2 text-grey-8">
                    A prompt engineering assistant for AI image generation.                
                </div>
              </div>
            </div>
            <q-btn
              v-if="activeTab === 'custom-styles'"
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
          <q-tab name="home" icon="home" label="Home" />
          <q-tab name="images" icon="photo_library" label="Images" @click="imagesRefreshToken += 1" />
          <q-tab name="saved-styles" icon="bookmark" label="Saved Styles" />
          <q-tab name="custom-styles" icon="palette" label="Custom Styles" />
          <q-tab name="prompt" icon="edit_note" label="Prompt" />
          <q-tab name="models" icon="tune" label="Models" @click="modelsRefreshToken += 1" />
          <q-tab name="jobs" icon="work_outline" label="Jobs" @click="jobsRefreshToken += 1" />
        </q-tabs>

        <q-tab-panels v-model="activeTab" animated keep-alive>

          <!-- ══ HOME TAB ══════════════════════════════════════════════ -->
          <q-tab-panel name="home" class="q-pa-none">
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-h6">Home</div>
                <div class="text-body2 text-grey-7 q-mt-sm">
                  Follow the workflow below to build and run an image-generation job.
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <q-stepper
                  v-model="homeStep"
                  flat
                  animated
                  header-nav
                  alternative-labels
                  color="primary"
                  active-color="primary"
                  done-color="secondary"
                  inactive-color="grey-7"
                >
                  <q-step :name="1" title="Choose Styles" icon="palette">
                    <div class="text-body1">Step 1 - Styles</div>
                    <div class="text-body2 text-grey-7 q-mt-sm">
                      <div class="row">
                        <div>                        
                            You have several choices for choosing and defining styles.
                        </div>
                        <div>
                          <img src="./assets/choose-style.png" alt="Choose styles tabs" class="q-my-md" />
                          <ul>
                            <li><span class="text-weight-bold">Images</span> Browse previously generated images in the library and apply their styles to your prompt.</li>
                            <li><span class="text-weight-bold">Saved Styles</span> Explore a collection of curated style prompts and add them to your prompt.</li>
                            <li><span class="text-weight-bold">Custom Styles</span> Create and manage your own custom styles for more personalized prompts.</li>
                          </ul>
                        </div>
                        <div>
                           Once you have defined some styles, you can add them to your prompt and see a summary of selected styles in the Prompt tab. 

                           A tip is to not overwhelm the prompt with too many styles at once - start with a few key styles and add more as needed when you review your prompt description in Step 2. 
                        </div>
                     </div>
                    </div>
                    <q-stepper-navigation>
                      <q-btn color="primary" label="Continue" @click="homeStep = 2" />
                    </q-stepper-navigation>
                  </q-step>

                  <q-step :name="2" title="Define your Prompt" icon="edit_note">
                    <div class="text-body1">Step 2 - Prompt</div>
                    <div class="text-body2 text-grey-7 q-mt-sm">
                      Add your help text for writing prompt descriptions and refinements here.
                    </div>
                    <q-stepper-navigation>
                      <q-btn flat label="Back" @click="homeStep = 1" />
                      <q-btn color="primary" label="Continue" @click="homeStep = 3" />
                    </q-stepper-navigation>
                  </q-step>

                  <q-step :name="3" title="Choose a Model" icon="tune">
                    <div class="text-body1">Section 3</div>
                    <div class="text-body2 text-grey-7 q-mt-sm">
                      Add your help text for model, provider, and execution settings here.
                    </div>
                    <q-stepper-navigation>
                      <q-btn flat label="Back" @click="homeStep = 2" />
                      <q-btn color="primary" label="Continue" @click="homeStep = 4" />
                    </q-stepper-navigation>
                  </q-step>

                  <q-step :name="4" title="Create and Run a Job" icon="work_outline">
                    <div class="text-body1">Section 4</div>
                    <div class="text-body2 text-grey-7 q-mt-sm">
                      Add your help text for assembling jobs, reviewing prompts, and running generation here.
                    </div>
                    <q-stepper-navigation>
                      <q-btn flat label="Back" @click="homeStep = 3" />
                    </q-stepper-navigation>
                  </q-step>
                </q-stepper>
              </q-card-section>
            </q-card>
          </q-tab-panel>

          <!-- ══ IMAGES TAB ═══════════════════════════════════════════ -->
          <q-tab-panel name="images" class="q-pa-none">
            <ImagesView
              :active="activeTab === 'images'"
              :refresh-token="imagesRefreshToken"
              @apply-styles="applyLibraryImageStyles"
            />
          </q-tab-panel>

          <!-- ══ SAVED STYLES TAB ═════════════════════════════════════ -->
          <q-tab-panel name="saved-styles" class="q-pa-none">
            <SavedStylesView @add-to-prompt="addSavedStyleToPrompt" />
          </q-tab-panel>

          <!-- ══ PROMPT TAB ════════════════════════════════════════════ -->
          <q-tab-panel name="prompt" class="q-pa-none">
            <q-card v-if="hasPromptSummary" flat bordered class="q-mb-md">
              <q-card-section class="row items-center justify-between q-gutter-sm">
                <div class="text-h6">Styles Selected</div>
              </q-card-section>
              <q-separator />
              <q-card-section class="q-pt-sm">
                <div v-if="promptSavedStyles.length" class="summary-row">
                  <span class="summary-dim">Saved Style:</span>
                  <span class="summary-vals">{{ promptSavedStyles.map((style) => style.name).join(', ') }}</span>
                </div>
                <div v-for="(values, dim) in promptSelectionSummary" :key="dim" class="summary-row">
                  <span class="summary-dim">{{ toTitle(dim) }}:</span>
                  <span class="summary-vals">{{ values.join(', ') }}</span>
                </div>
              </q-card-section>
            </q-card>

            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-h6">Prompt Description</div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <q-input
                  v-model="description"
                  type="textarea"
                  outlined
                  autogrow
                  placeholder="Add a description for this prompt..."
                />
              </q-card-section>
            </q-card>

            <q-card flat bordered class="q-mb-md">
              <q-card-section class="row items-center justify-between q-gutter-sm">
                <div class="text-h6">Prompt</div>
                <q-btn
                  label="Add to Job"
                  color="secondary"
                  outline
                  icon="playlist_add"
                  :disable="!canAddPromptToJob"
                  @click="showAddToJob = true"
                />
              </q-card-section>
              <q-separator />
              <q-card-section>
                <div class="text-body2" style="white-space: pre-wrap; line-height: 1.5;">
                  {{ fullPromptPreview || 'No prompt content yet. Add styles or a prompt description first.' }}
                </div>
              </q-card-section>
            </q-card>
          </q-tab-panel>

          <!-- ══ JOBS TAB ══════════════════════════════════════════════ -->
          <q-tab-panel name="jobs" class="q-pa-none">
            <JobsView :active="activeTab === 'jobs'" :refresh-token="jobsRefreshToken" />
          </q-tab-panel>

          <!-- ══ MODELS TAB ═══════════════════════════════════════════ -->
          <q-tab-panel name="models" class="q-pa-none">
            <ModelsView :active="activeTab === 'models'" :refresh-token="modelsRefreshToken" @save-success="activeTab = 'jobs'" />
          </q-tab-panel>

          <!-- ══ CUSTOM STYLES TAB ═════════════════════════════════════ -->
          <q-tab-panel name="custom-styles" class="q-pa-none">

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
              class="bg-grey-2 text-blue-8 q-mb-md q-mx-lg" 
            >
              Select both a category and a subcategory to view custom style options.
            </q-banner>
            <q-card v-if="selectedCategory && selectedSubcategory" flat bordered class="q-mb-md">
              <q-card-section class="row items-center justify-between q-gutter-sm">
                <div class="row items-center q-gutter-xs">
                  <div class="text-h6 q-mr-xs">Styles</div>
                  <span class="scope-legend global">Global</span>
                  <span class="scope-legend category">Category</span>
                  <span class="scope-legend subcategory">Subcategory</span>
                </div>
                <div class="row q-gutter-sm items-center">
                  <q-btn flat dense round icon="unfold_more" @click="expandAll">
                    <q-tooltip>Expand all sections</q-tooltip>
                  </q-btn>
                  <q-btn flat dense round icon="unfold_less" @click="collapseAll">
                    <q-tooltip>Collapse all sections</q-tooltip>
                  </q-btn>
                  <q-btn label="Clear" flat color="negative" @click="clearSelections" />
                </div>
              </q-card-section>

              <q-separator />

              <q-card-section>
                <q-list separator>
                  <q-expansion-item
                    v-for="dimension in dimensions"
                    :key="dimension"
                    :model-value="expandedState[dimension]"
                    @update:model-value="(val) => onDimensionToggle(dimension, val)"
                    :label="toTitle(dimension)"
                    :caption="dimensionCountLabel(dimension)"
                    expand-separator
                    header-class="expansion-header-primary"
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
            <!-- selection summary -->
            <q-card v-if="hasSummary || promptSavedStyles.length" flat bordered class="q-mb-md">
              <q-card-section class="row items-center justify-between q-gutter-sm">
                <div class="text-h6">Styles Selected</div>
                <q-btn
                  label="Add to Prompt"
                  color="secondary"
                  outline
                  icon="playlist_add"
                  @click="addCurrentSelectionToPrompt"
                />
              </q-card-section>
              <q-separator />
              <q-card-section class="q-pt-sm">
                <div v-if="promptSavedStyles.length" class="summary-row">
                  <span class="summary-dim">Saved Style:</span>
                  <span class="summary-vals">{{ promptSavedStyles.map((style) => style.name).join(', ') }}</span>
                </div>
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

          </q-tab-panel><!-- /custom styles tab -->

        </q-tab-panels>

        <!-- global dialog — must be outside tab panels so it renders on any active tab -->
        <AddToJobDialog v-model="showAddToJob" :prompt-payload="promptPayloadForJob" @success="activeTab = 'models'" />

      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import styleData from './assets/custom-styles.json';
import mirapromptLogo from './assets/miraprompt.png';
import sampleImage from './assets/sample-image.svg';
import { buildMergedStylesWithScopes, orderedDimensions, getStyleChips, SCOPE_PRIORITY } from './utils/style-data';
import { listGeneratedImages } from './api/jobs.js';
import AddToJobDialog from './components/AddToJobDialog.vue';
import ImagesView from './components/ImagesView.vue';
import JobsView from './components/JobsView.vue';
import ModelsView from './components/ModelsView.vue';
import SavedStylesView from './components/SavedStylesView.vue';

// ── reactive state ───────────────────────────────────────────────────────────
const selectedCategory = ref(null);
const selectedSubcategory = ref(null);
const activeTab = ref('home');
const imagesRefreshToken = ref(0);
const jobsRefreshToken = ref(0);
const modelsRefreshToken = ref(0);
const homeStep = ref(1);
const showAddToJob = ref(false);
const lightboxImage = ref(null);
const panelOpen = ref(true);
const generatedImages = ref([]);
const generatedImagesLoading = ref(false);
const selectedMap = ref({});
const description = ref('');
const promptDraft = ref({
  category: null,
  subcategory: null,
  styles: {},
  savedStyles: [],
});
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

const promptSavedStyles = computed(() => promptDraft.value.savedStyles || []);
const primarySavedStyle = computed(() => promptSavedStyles.value[0] || null);

const promptDescriptionForJob = computed(() => {
  return description.value.trim();
});

const promptStylesForJob = computed(() => {
  const styles = cloneStyles(promptDraft.value.styles || {});
  if (promptSavedStyles.value.length) {
    styles['saved-styles'] = promptSavedStyles.value.map((style) => ({
      category: String(style?.category || '').trim(),
      name: String(style?.name || '').trim(),
      prompt: String(style?.prompt || '').trim(),
    }));
  }
  return styles;
});

const promptPayloadForJob = computed(() => ({
  category: promptDraft.value.category || primarySavedStyle.value?.category || null,
  subcategory: promptDraft.value.subcategory || primarySavedStyle.value?.name || null,
  description: promptDescriptionForJob.value,
  styles: promptStylesForJob.value,
  transformedPrompt: fullPromptPreview.value,
}));

const promptSelectionSummary = computed(() => {
  const raw = promptDraft.value.styles || {};
  const result = {};
  orderedDimensions(raw).forEach((dim) => {
    if (dim === 'saved-styles') return;
    const groups = raw[dim] || {};
    const all = Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .flatMap((groupName) => groups[groupName] || []);
    if (all.length) result[dim] = all;
  });
  return result;
});

const hasPromptSummary = computed(() => {
  return Object.keys(promptSelectionSummary.value).length > 0 || promptSavedStyles.value.length > 0;
});

const promptStyleCount = computed(() => {
  return Object.entries(promptDraft.value.styles || {}).reduce((acc, [dimension, groups]) => {
    if (dimension === 'saved-styles') return acc;
    const groupCount = Object.values(groups || {}).reduce((sum, options) => sum + (options?.length || 0), 0);
    return acc + groupCount;
  }, 0);
});

const canAddPromptToJob = computed(() => {
  return promptStyleCount.value > 0 || promptSavedStyles.value.length > 0 || promptDescriptionForJob.value.length > 0;
});

const styleSummaryLines = computed(() => {
  return Object.entries(promptSelectionSummary.value).map(([dimension, values]) => {
    return `${toTitle(dimension)}: ${values.join(', ')}`;
  });
});

const fullPromptPreview = computed(() => {
  const parts = [...styleSummaryLines.value];
  promptSavedStyles.value.forEach((style) => {
    const text = String(style?.prompt || '').trim();
    if (text) parts.push(text);
  });
  const desc = description.value.trim();
  if (desc) parts.push(desc);
  return parts.join(', ');
});

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
    newDims.forEach((d) => { state[d] = false; });
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

function onDimensionToggle(dim, val) {
  if (val) {
    // accordion: opening one collapses all others
    dimensions.value.forEach((d) => { expandedState.value[d] = d === dim; });
  } else {
    expandedState.value[dim] = false;
  }
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

function cloneStyles(styles) {
  return JSON.parse(JSON.stringify(styles || {}));
}

function addCurrentSelectionToPrompt() {
  promptDraft.value = {
    category: selectedCategory.value,
    subcategory: selectedSubcategory.value,
    styles: cloneStyles(selectedPayload.value.styles),
    savedStyles: [...(promptDraft.value.savedStyles || [])],
  };
  activeTab.value = 'prompt';
}

function addSavedStyleToPrompt(savedStyle) {
  const category = String(savedStyle?.category || '').trim();
  const name = String(savedStyle?.name || '').trim();
  const prompt = String(savedStyle?.prompt || '').trim();
  if (!name || !prompt) return;

  const existing = promptDraft.value.savedStyles || [];
  const alreadyAdded = existing.some((item) => item.category === category && item.name === name && item.prompt === prompt);
  if (!alreadyAdded) {
    promptDraft.value = {
      ...promptDraft.value,
      savedStyles: [...existing, { category, name, prompt }],
    };
  }
  activeTab.value = 'prompt';
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
    if (dimension === 'saved-styles' || Array.isArray(groups)) continue;
    for (const [groupName, options] of Object.entries(groups || {})) {
      for (const option of (options || [])) {
        selectedMap.value[keyFor(dimension, groupName, option)] = true;
      }
    }
  }
  lightboxImage.value = null;
}

async function applyLibraryImageStyles(img) {
  if (!img?.styles) return;

  activeTab.value = 'custom-styles';
  selectedCategory.value = img.category || null;
  await nextTick();
  selectedSubcategory.value = img.subcategory || null;
  await nextTick();

  selectedMap.value = {};
  for (const [dimension, groups] of Object.entries(img.styles)) {
    if (dimension === 'saved-styles' || Array.isArray(groups)) continue;
    for (const [groupName, options] of Object.entries(groups || {})) {
      for (const option of (options || [])) {
        selectedMap.value[keyFor(dimension, groupName, option)] = true;
      }
    }
  }
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
