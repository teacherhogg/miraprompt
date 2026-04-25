import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';

// Models whose server-catalog aspect ratios don't match what fal.ai actually accepts
const MODEL_BLOCKLIST = new Set(['openai/gpt-image-2', 'xai/grok-imagine-image']);

function filterTextToImageModels(models) {
  return models.filter((m) => {
    if (m.id.includes('edit')) return false;
    if (MODEL_BLOCKLIST.has(m.id)) return false;
    const requiresImageInput = (m.specificOptions || []).some(
      (opt) => opt.mode === 'image' || opt.mode === 'images' || opt.mode === 'character-chain-image'
    );
    return !requiresImageInput;
  });
}

function flattenStyles(sections) {
  return (sections || []).flatMap((s) =>
    (s.items || []).map((item) => ({
      name: item.name,
      category: item.category || s.title,
      prompt: item.prompt,
    }))
  );
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

export async function analyzeMarkdown(filePath, config) {
  const [markdownContent, stylesData, modelsData] = await Promise.all([
    fs.readFile(filePath, 'utf-8'),
    fetchJson(`${config.serverUrl}/api/saved-styles`),
    fetchJson(`${config.serverUrl}/api/models`),
  ]);

  const styles = flattenStyles(stylesData.sections);
  const models = filterTextToImageModels(modelsData.models);

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const systemPrompt = `You analyze markdown note content and configure AI image generation for it.

Available saved styles — return up to 5 of these by their exact prompt text:
${JSON.stringify(styles.map((s) => ({ name: s.name, category: s.category, prompt: s.prompt })), null, 2)}

Available models:
${JSON.stringify(models.map((m) => ({ id: m.id, provider: m.provider })), null, 2)}

Default model: ${config.defaultModelId}

Rules:
- imagePrompt: vivid, concrete image description that visually represents the note's theme and content
- selectedStylePrompts: array of prompt text strings (not names) from the styles list above; choose 1-5 that complement the image
- modelId: must be one of the listed model IDs
- jobName: short slug-friendly label based on the note title or topic`;

  const response = await client.messages.create({
    model: config.claudeModel,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'generate_image_config',
        description: 'Output image generation configuration for this markdown note',
        input_schema: {
          type: 'object',
          properties: {
            imagePrompt: { type: 'string' },
            selectedStylePrompts: { type: 'array', items: { type: 'string' } },
            modelId: { type: 'string' },
            jobName: { type: 'string' },
          },
          required: ['imagePrompt', 'selectedStylePrompts', 'modelId', 'jobName'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'generate_image_config' },
    messages: [
      {
        role: 'user',
        content: `Generate image settings for this Obsidian note:\n\n${markdownContent}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return a tool_use block');

  const result = toolUse.input;

  const validIds = new Set(models.map((m) => m.id));
  if (!validIds.has(result.modelId)) {
    result.modelId = config.defaultModelId;
  }

  return result;
}
