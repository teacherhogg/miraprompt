function flattenStyles(styles) {
  const lines = [];
  const dimensions = Object.keys(styles || {}).sort((a, b) => a.localeCompare(b));

  for (const dimension of dimensions) {
    const groups = styles[dimension] || {};
    const groupParts = Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((groupName) => `${groupName}: ${groups[groupName].join(', ')}`);

    if (groupParts.length) {
      lines.push(`${dimension}: ${groupParts.join(' | ')}`);
    }
  }

  return lines;
}

export function transformPromptForFal(prompt, execution) {
  const lines = [];

  if (prompt.description?.trim()) {
    lines.push(prompt.description.trim());
  }

  if (prompt.category) lines.push(`Category: ${prompt.category}`);
  if (prompt.subcategory) lines.push(`Subcategory: ${prompt.subcategory}`);

  const styleLines = flattenStyles(prompt.styles);
  if (styleLines.length) {
    lines.push('Style directives:');
    lines.push(...styleLines);
  }

  if (execution?.settings?.negativePrompt?.trim()) {
    lines.push(`Avoid: ${execution.settings.negativePrompt.trim()}`);
  }

  return lines.join('\n');
}
