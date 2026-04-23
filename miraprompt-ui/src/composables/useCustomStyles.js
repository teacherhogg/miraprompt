import { computed, ref, watch } from 'vue';
import styleData from '../assets/custom-styles.json';
import { buildMergedStylesWithScopes, orderedDimensions, getStyleChips, SCOPE_PRIORITY } from '../utils/style-data';
import { listGeneratedImages } from '../api/jobs.js';

export function useCustomStyles() {
  const selectedCategory = ref(null);
  const selectedSubcategory = ref(null);
  const selectedMap = ref({});
  const expandedState = ref({});
  const generatedImages = ref([]);
  const generatedImagesLoading = ref(false);
  const lightboxImage = ref(null);

  // ── derived style data ─────────────────────────────────────────────────────

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
    const payload = { category: selectedCategory.value, subcategory: selectedSubcategory.value, styles: {} };
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

  // ── watchers ───────────────────────────────────────────────────────────────

  watch(selectedCategory, () => {
    selectedSubcategory.value = null;
    selectedMap.value = {};
    generatedImages.value = [];
  });

  watch(selectedSubcategory, () => {
    selectedMap.value = {};
    refreshGeneratedImages();
  });

  watch(dimensions, (newDims) => {
    const state = {};
    newDims.forEach((d) => { state[d] = false; });
    expandedState.value = state;
  }, { immediate: true });

  // ── functions ──────────────────────────────────────────────────────────────

  function keyFor(dimension, groupName, option) {
    return `${dimension}|||${groupName}|||${option}`;
  }

  function expandAll() { dimensions.value.forEach((d) => { expandedState.value[d] = true; }); }
  function collapseAll() { dimensions.value.forEach((d) => { expandedState.value[d] = false; }); }

  function onDimensionToggle(dim, val) {
    if (val) {
      dimensions.value.forEach((d) => { expandedState.value[d] = d === dim; });
    } else {
      expandedState.value[dim] = false;
    }
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

  function clearSelections() { selectedMap.value = {}; }

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

  function applyStyleMap(img) {
    clearSelections();
    for (const [dimension, groups] of Object.entries(img.styles || {})) {
      if (dimension === 'saved-styles' || Array.isArray(groups)) continue;
      for (const [groupName, options] of Object.entries(groups || {})) {
        for (const option of (options || [])) {
          selectedMap.value[keyFor(dimension, groupName, option)] = true;
        }
      }
    }
  }

  async function refreshGeneratedImages() {
    if (!selectedSubcategory.value) { generatedImages.value = []; return; }
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

  function dimensionCountLabel(dimension) {
    const selDim = selectedPayload.value.styles?.[dimension] || {};
    const selectedCount = Object.values(selDim).reduce((acc, list) => acc + list.length, 0);
    const totalCount = Object.values(mergedStyles.value?.[dimension] || {}).reduce((acc, list) => acc + list.length, 0);
    return `${selectedCount}/${totalCount} selected`;
  }

  function optionScopeClass(dimension, groupName, option) {
    return `scope-${styleScopes.value?.[dimension]?.[groupName]?.[option] || 'global'}`;
  }

  function orderedGroupNames(dimension) {
    const groups = Object.keys(mergedStyles.value[dimension] || {});
    return groups.sort((a, b) => {
      const pa = SCOPE_PRIORITY[groupScopeMap.value[dimension]?.[a]] || 1;
      const pb = SCOPE_PRIORITY[groupScopeMap.value[dimension]?.[b]] || 1;
      return pb - pa;
    });
  }

  return {
    selectedCategory, selectedSubcategory, selectedMap, expandedState,
    generatedImages, generatedImagesLoading, lightboxImage, lightboxOpen,
    categoryOptions, subcategoryOptions, mergedStyles, styleScopes,
    dimensions, selectedPayload, selectionSummary, hasSummary,
    expandAll, collapseAll, onDimensionToggle,
    isSelected, toggleSelection, clearSelections,
    applyImageStyles, applyStyleMap, refreshGeneratedImages,
    getImageChips, lightboxPromptText,
    dimensionCountLabel, optionScopeClass, orderedGroupNames,
  };
}
