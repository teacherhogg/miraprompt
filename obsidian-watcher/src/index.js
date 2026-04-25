import { startWatcher } from './watcher.js';

const required = [
  'ANTHROPIC_API_KEY',
  'OBSIDIAN_VAULT_PATH',
  'MIRAPROMPT_SERVER_URL',
  'MIRAPROMPT_DATA_DIR',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  vaultPath: process.env.OBSIDIAN_VAULT_PATH,
  attachmentsDir: process.env.OBSIDIAN_ATTACHMENTS_DIR || '_generated',
  miraDatDir: process.env.MIRAPROMPT_DATA_DIR,
  serverUrl: process.env.MIRAPROMPT_SERVER_URL,
  defaultModelId: process.env.DEFAULT_MODEL_ID || 'flux/schnell',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
  testingMaxImages: parseInt(process.env.TESTING_MAX_IMAGES || '0', 10),
};

console.log(`Obsidian watcher starting`);
console.log(`  Vault: ${config.vaultPath}`);
console.log(`  Attachments dir: ${config.attachmentsDir}`);
console.log(`  miraprompt-server: ${config.serverUrl}`);

startWatcher(config);
