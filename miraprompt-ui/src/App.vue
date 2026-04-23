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
            <div class="row items-center q-gutter-sm">
              <q-btn
                flat dense round
                icon="playlist_remove"
                color="grey-7"
                @click="showClearPromptDialog = true"
              >
                <q-tooltip>Clear Current Prompt</q-tooltip>
              </q-btn>
              <q-btn
                v-if="activeTab === 'custom-styles'"
                flat dense round
                icon="view_sidebar"
                :color="panelOpen ? 'primary' : 'grey-7'"
                @click="panelOpen = !panelOpen"
              >
                <q-tooltip>{{ panelOpen ? 'Hide image panel' : 'Show image panel' }}</q-tooltip>
              </q-btn>
            </div>
          </q-card-section>
        </q-card>

        <q-dialog v-model="showClearPromptDialog">
          <q-card style="min-width: 320px;">
            <q-card-section>
              <div class="text-h6">Clear Current Prompt</div>
            </q-card-section>
            <q-separator />
            <q-card-section class="q-gutter-sm">
              <q-checkbox v-model="clearPromptStyles" label="Clear Styles" />
              <q-checkbox v-model="clearPromptDescription" label="Clear Description" />
            </q-card-section>
            <q-separator />
            <q-card-actions align="right">
              <q-btn flat label="Cancel" color="grey-7" v-close-popup />
              <q-btn flat label="OK" color="negative" @click="executeClearPrompt" />
            </q-card-actions>
          </q-card>
        </q-dialog>

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
            <HomeWorkflowContent />
          </q-tab-panel>

          <!-- ══ IMAGES TAB ═══════════════════════════════════════════ -->
          <q-tab-panel name="images" class="q-pa-none">
            <ImagesView
              :active="activeTab === 'images'"
              :refresh-token="imagesRefreshToken"
              @apply-styles="applyLibraryImageStyles"
              @saved-style-created="onSavedStyleChanged"
            />
          </q-tab-panel>

          <!-- ══ SAVED STYLES TAB ═════════════════════════════════════ -->
          <q-tab-panel name="saved-styles" class="q-pa-none">
            <SavedStylesView
              :active="activeTab === 'saved-styles'"
              :refresh-token="savedStylesRefreshToken"
              @add-to-prompt="addSavedStyleToPrompt"
            />
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
                  placeholder="Add a description to this prompt (typically the subject and background depending on styles chosen)..."
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
                label="Add Styles to Prompt"
                :disable="!lightboxImage?.styles || !Object.keys(lightboxImage.styles).length"
                @click="applyImageStyles(lightboxImage)"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>

          </q-tab-panel><!-- /custom styles tab -->

        </q-tab-panels>

        <!-- global dialog — must be outside tab panels so it renders on any active tab -->
        <AddToJobDialog v-model="showAddToJob" :prompt-payload="promptPayloadForJob" @success="onAddToJobSuccess" />

      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { nextTick, ref } from 'vue';
import mirapromptLogo from './assets/miraprompt.png';
import sampleImage from './assets/sample-image.svg';
import AddToJobDialog from './components/AddToJobDialog.vue';
import HomeWorkflowContent from './components/HomeWorkflowContent.vue';
import ImagesView from './components/ImagesView.vue';
import JobsView from './components/JobsView.vue';
import ModelsView from './components/ModelsView.vue';
import SavedStylesView from './components/SavedStylesView.vue';
import { useCustomStyles } from './composables/useCustomStyles.js';
import { usePrompt, toTitle } from './composables/usePrompt.js';

// ── layout / navigation state ────────────────────────────────────────────────
const activeTab = ref('home');
const imagesRefreshToken = ref(0);
const jobsRefreshToken = ref(0);
const modelsRefreshToken = ref(0);
const savedStylesRefreshToken = ref(0);
const panelOpen = ref(true);
const showAddToJob = ref(false);
const showClearPromptDialog = ref(false);
const clearPromptStyles = ref(true);
const clearPromptDescription = ref(true);

// ── composables ──────────────────────────────────────────────────────────────
const {
  selectedCategory, selectedSubcategory, expandedState,
  generatedImages, generatedImagesLoading, lightboxImage, lightboxOpen,
  categoryOptions, subcategoryOptions, mergedStyles,
  dimensions, selectedPayload, selectionSummary, hasSummary,
  expandAll, collapseAll, onDimensionToggle,
  isSelected, toggleSelection, clearSelections,
  applyImageStyles, applyStyleMap,
  getImageChips, lightboxPromptText,
  dimensionCountLabel, optionScopeClass, orderedGroupNames,
} = useCustomStyles();

const {
  description,
  promptSavedStyles, promptPayloadForJob,
  promptSelectionSummary, hasPromptSummary,
  canAddPromptToJob, fullPromptPreview,
  setPromptFromSelection,
  addSavedStyleToPrompt: addSavedStyleToPromptDraft,
  clearStyles, clearDescription, resetAll,
} = usePrompt();

// ── bridge functions ─────────────────────────────────────────────────────────

function addCurrentSelectionToPrompt() {
  setPromptFromSelection(selectedCategory.value, selectedSubcategory.value, selectedPayload.value.styles);
  activeTab.value = 'prompt';
}

function addSavedStyleToPrompt(savedStyle) {
  addSavedStyleToPromptDraft(savedStyle);
  activeTab.value = 'prompt';
}

function onAddToJobSuccess() {
  clearSelections();
  resetAll();
  activeTab.value = 'models';
}

function executeClearPrompt() {
  if (clearPromptStyles.value) {
    clearSelections();
    clearStyles();
  }
  if (clearPromptDescription.value) {
    clearDescription();
  }
  showClearPromptDialog.value = false;
}

function onSavedStyleChanged() {
  savedStylesRefreshToken.value += 1;
}

async function applyLibraryImageStyles(img) {
  if (!img?.styles) return;
  activeTab.value = 'custom-styles';
  selectedCategory.value = img.category || null;
  await nextTick();
  selectedSubcategory.value = img.subcategory || null;
  await nextTick();
  applyStyleMap(img);
}
</script>
