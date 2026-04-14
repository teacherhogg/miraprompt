const BASE_DIMENSION_ORDER = [
  'composition',
  'lighting',
  'color palette',
  'detail level',
  'mood',
  'background',
];

function toTitle(text) {
  return String(text)
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function orderedDimensions(styles) {
  const all = Object.keys(styles || {}).filter((key) => key !== 'saved-styles');
  const ordered = BASE_DIMENSION_ORDER.filter((key) => all.includes(key));
  const extras = all.filter((key) => !BASE_DIMENSION_ORDER.includes(key)).sort((a, b) => a.localeCompare(b));
  return ordered.concat(extras);
}

function buildStyleSummaryLines(styles) {
  const lines = [];

  orderedDimensions(styles).forEach((dimension) => {
    const groups = styles?.[dimension] || {};
    Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .forEach((groupName) => {
        const values = groups[groupName] || [];
        if (values.length) {
          lines.push(`${toTitle(groupName)}: ${values.join(', ')}`);
        }
      });
  });

  return lines;
}

function buildSavedStylePromptLines(styles) {
  const savedStyles = Array.isArray(styles?.['saved-styles']) ? styles['saved-styles'] : [];
  return savedStyles
    .map((style) => String(style?.prompt || '').trim())
    .filter(Boolean);
}

export function transformPromptForFal(prompt, _execution) {
  const parts = [
    ...buildStyleSummaryLines(prompt?.styles || {}),
    ...buildSavedStylePromptLines(prompt?.styles || {}),
  ];

  const description = String(prompt?.description || '').trim();
  if (description) {
    parts.push(description);
  }

  return parts.join(', ');
}
