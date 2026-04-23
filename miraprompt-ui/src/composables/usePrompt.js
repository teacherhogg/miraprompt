import { computed, ref } from 'vue';
import { orderedDimensions } from '../utils/style-data';

export function toTitle(text) {
  return String(text)
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function cloneStyles(styles) {
  return JSON.parse(JSON.stringify(styles || {}));
}

export function usePrompt() {
  const description = ref('');
  const promptDraft = ref({
    category: null,
    subcategory: null,
    styles: {},
    savedStyles: [],
  });

  const promptSavedStyles = computed(() => promptDraft.value.savedStyles || []);
  const primarySavedStyle = computed(() => promptSavedStyles.value[0] || null);

  const promptDescriptionForJob = computed(() => description.value.trim());

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

  const styleSummaryLines = computed(() => {
    const lines = [];
    const raw = promptDraft.value.styles || {};
    orderedDimensions(raw).forEach((dimension) => {
      const groups = raw[dimension] || {};
      Object.keys(groups)
        .sort((a, b) => a.localeCompare(b))
        .forEach((groupName) => {
          const values = groups[groupName] || [];
          if (values.length) lines.push(`${toTitle(groupName)}: ${values.join(', ')}`);
        });
    });
    return lines;
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

  const hasPromptSummary = computed(() =>
    Object.keys(promptSelectionSummary.value).length > 0 || promptSavedStyles.value.length > 0
  );

  const promptStyleCount = computed(() =>
    Object.entries(promptDraft.value.styles || {}).reduce((acc, [dimension, groups]) => {
      if (dimension === 'saved-styles') return acc;
      return acc + Object.values(groups || {}).reduce((sum, opts) => sum + (opts?.length || 0), 0);
    }, 0)
  );

  const canAddPromptToJob = computed(() =>
    promptStyleCount.value > 0 || promptSavedStyles.value.length > 0 || promptDescriptionForJob.value.length > 0
  );

  function setPromptFromSelection(category, subcategory, styles) {
    promptDraft.value = {
      category,
      subcategory,
      styles: cloneStyles(styles),
      savedStyles: [...(promptDraft.value.savedStyles || [])],
    };
  }

  function addSavedStyleToPrompt(savedStyle) {
    const category = String(savedStyle?.category || '').trim();
    const name = String(savedStyle?.name || '').trim();
    const prompt = String(savedStyle?.prompt || '').trim();
    if (!name || !prompt) return;

    const existing = promptDraft.value.savedStyles || [];
    const alreadyAdded = existing.some(
      (item) => item.category === category && item.name === name && item.prompt === prompt
    );
    if (!alreadyAdded) {
      promptDraft.value = { ...promptDraft.value, savedStyles: [...existing, { category, name, prompt }] };
    }
  }

  function clearStyles() {
    promptDraft.value = { ...promptDraft.value, styles: {}, savedStyles: [] };
  }

  function clearDescription() {
    description.value = '';
  }

  function resetAll() {
    description.value = '';
    promptDraft.value = { category: null, subcategory: null, styles: {}, savedStyles: [] };
  }

  return {
    description, promptDraft,
    promptSavedStyles,
    promptPayloadForJob, promptSelectionSummary, hasPromptSummary,
    canAddPromptToJob, fullPromptPreview,
    setPromptFromSelection, addSavedStyleToPrompt,
    clearStyles, clearDescription, resetAll,
  };
}
