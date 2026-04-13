const CATEGORY_ALIASES = {
  'Comic and Cartoon': 'Comic and Cartoons',
  'Ancient and Primitive Art': 'Ancient and Primitive'
};

export const BASE_DIMENSION_ORDER = [
  'composition',
  'lighting',
  'color palette',
  'detail level',
  'mood',
  'background'
];

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

export const SCOPE_PRIORITY = {
  global: 1,
  category: 2,
  subcategory: 3,
};

function mergeStyleBlock(target, styleBlock) {
  if (!styleBlock || typeof styleBlock !== 'object') {
    return;
  }

  Object.entries(styleBlock).forEach(([dimension, groups]) => {
    if (!target[dimension]) {
      target[dimension] = {};
    }

    if (!groups || typeof groups !== 'object') {
      return;
    }

    Object.entries(groups).forEach(([groupName, options]) => {
      const current = target[dimension][groupName] || [];
      const next = Array.isArray(options) ? options : [];
      target[dimension][groupName] = uniq(current.concat(next));
    });
  });
}

function mergeStyleBlockWithScopes(target, scopeMap, styleBlock, scope) {
  if (!styleBlock || typeof styleBlock !== 'object') {
    return;
  }

  Object.entries(styleBlock).forEach(([dimension, groups]) => {
    if (!target[dimension]) target[dimension] = {};
    if (!scopeMap[dimension]) scopeMap[dimension] = {};
    if (!groups || typeof groups !== 'object') return;

    Object.entries(groups).forEach(([groupName, options]) => {
      const current = target[dimension][groupName] || [];
      const next = Array.isArray(options) ? options : [];
      target[dimension][groupName] = uniq(current.concat(next));

      if (!scopeMap[dimension][groupName]) scopeMap[dimension][groupName] = {};
      next.forEach((option) => {
        const existing = scopeMap[dimension][groupName][option];
        if (!existing || SCOPE_PRIORITY[scope] > SCOPE_PRIORITY[existing]) {
          scopeMap[dimension][groupName][option] = scope;
        }
      });
    });
  });
}

export function resolveCategoryNode(data, selectedCategory) {
  if (!selectedCategory) {
    return null;
  }

  const stylesRoot = data?.styles || {};
  const globalNode = stylesRoot?.Global || {};
  const alias = CATEGORY_ALIASES[selectedCategory];

  return (
    stylesRoot[selectedCategory] ||
    stylesRoot[alias] ||
    globalNode[selectedCategory] ||
    globalNode[alias] ||
    null
  );
}

export function buildMergedStyles(data, selectedCategory, selectedSubcategory) {
  const merged = {};
  const globalNode = data?.styles?.Global || {};

  mergeStyleBlock(merged, globalNode.styles);

  const categoryNode = resolveCategoryNode(data, selectedCategory);
  if (categoryNode?.styles) {
    mergeStyleBlock(merged, categoryNode.styles);
  }

  if (selectedSubcategory && categoryNode && categoryNode[selectedSubcategory]?.styles) {
    mergeStyleBlock(merged, categoryNode[selectedSubcategory].styles);
  }

  return merged;
}

export function buildMergedStylesWithScopes(data, selectedCategory, selectedSubcategory) {
  const merged = {};
  const scopeMap = {};
  const globalNode = data?.styles?.Global || {};

  mergeStyleBlockWithScopes(merged, scopeMap, globalNode.styles, 'global');

  const categoryNode = resolveCategoryNode(data, selectedCategory);
  if (categoryNode?.styles) {
    mergeStyleBlockWithScopes(merged, scopeMap, categoryNode.styles, 'category');
  }

  if (selectedSubcategory && categoryNode && categoryNode[selectedSubcategory]?.styles) {
    mergeStyleBlockWithScopes(
      merged,
      scopeMap,
      categoryNode[selectedSubcategory].styles,
      'subcategory'
    );
  }

  return { merged, scopeMap };
}

export function orderedDimensions(merged) {
  const all = Object.keys(merged || {});
  const ordered = BASE_DIMENSION_ORDER.filter((key) => all.includes(key));
  const extras = all.filter((key) => !BASE_DIMENSION_ORDER.includes(key)).sort();
  return ordered.concat(extras);
}

/**
 * Build a flat list of style chips for a generated image, with scope coloring.
 * Each chip is { option: string, scope: 'global' | 'category' | 'subcategory' }.
 */
export function getStyleChips(data, category, subcategory, selectedStyles) {
  if (!selectedStyles || !Object.keys(selectedStyles).length) return [];
  const { scopeMap } = buildMergedStylesWithScopes(data, category, subcategory);
  const chips = [];
  for (const [dimension, groups] of Object.entries(selectedStyles)) {
    for (const [groupName, options] of Object.entries(groups || {})) {
      for (const option of (options || [])) {
        const scope = scopeMap?.[dimension]?.[groupName]?.[option] || 'global';
        chips.push({ option, scope });
      }
    }
  }
  return chips;
}
