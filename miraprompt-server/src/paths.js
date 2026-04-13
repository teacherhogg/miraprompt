import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');

export function getDataDir() {
  const configured = String(process.env.MIRAPROMPT_DATA_DIR || './data').trim();
  if (path.isAbsolute(configured)) {
    return configured;
  }
  return path.resolve(PROJECT_ROOT, configured);
}
