import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDataDir } from './paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = getDataDir();
const DATA_ROOT = path.dirname(DATA_DIR);
const SAVED_STYLES_DIR = path.join(DATA_DIR, 'saved-styles');
const USER_SAVED_FILE = path.join(SAVED_STYLES_DIR, 'user-saved-styles.json');
const DELETED_STYLES_FILE = path.join(SAVED_STYLES_DIR, 'deleted-styles.json');
const SERVER_SUPPLIED_STYLES_FILE = path.join(__dirname, 'assets', 'saved-styles.json');

let cachedSuppliedStylesFile = null;

function normalizeConfiguredPath(value) {
  const input = String(value || '').trim();
  if (!input) return null;
  if (path.isAbsolute(input)) return input;
  return path.resolve(process.cwd(), input);
}

async function resolveSuppliedStylesFile() {
  if (cachedSuppliedStylesFile) {
    return cachedSuppliedStylesFile;
  }

  const configured = normalizeConfiguredPath(process.env.MIRAPROMPT_SUPPLIED_STYLES_FILE);
  const candidates = [
    configured,
    SERVER_SUPPLIED_STYLES_FILE,
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      cachedSuppliedStylesFile = candidate;
      return candidate;
    } catch {
      // Continue trying other candidate roots.
    }
  }

  throw new Error(
    `Unable to locate supplied styles file. Tried: ${candidates.join(', ')}`
  );
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function normalizeCategory(category) {
  return String(category || '').trim();
}

function extFromPath(filePathLike, fallback = '.png') {
  const ext = path.extname(String(filePathLike || '')).toLowerCase();
  return ext || fallback;
}

function extFromContentType(contentType) {
  const value = String(contentType || '').toLowerCase();
  if (value.includes('png')) return '.png';
  if (value.includes('webp')) return '.webp';
  if (value.includes('jpeg') || value.includes('jpg')) return '.jpg';
  if (value.includes('gif')) return '.gif';
  if (value.includes('avif')) return '.avif';
  return '.png';
}

function safeStem(text) {
  return String(text || 'saved-style')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'saved-style';
}

function toAbsoluteDataRootPath(maybeRelativePath) {
  const input = String(maybeRelativePath || '').trim();
  if (!input) return null;
  if (path.isAbsolute(input)) return input;
  return path.resolve(DATA_ROOT, input);
}

function normalizeUserStyleRecord(record) {
  return {
    name: String(record?.name || '').trim(),
    category: String(record?.category || '').trim(),
    prompt: String(record?.prompt || '').trim(),
    imagePath: record?.imagePath ? String(record.imagePath).replace(/\\/g, '/') : null,
    styles: record?.styles && typeof record.styles === 'object' ? record.styles : {},
    source: 'user',
    createdAt: record?.createdAt || new Date().toISOString(),
    updatedAt: record?.updatedAt || new Date().toISOString(),
  };
}

function normalizeDeletedRecord(record) {
  return {
    name: String(record?.name || '').trim(),
    category: String(record?.category || '').trim(),
    deletedAt: record?.deletedAt || new Date().toISOString(),
  };
}

function styleKey(category, name) {
  return `${normalizeCategory(category)}|||${normalizeName(name)}`;
}

export async function ensureSavedStylesStorage() {
  await fs.mkdir(SAVED_STYLES_DIR, { recursive: true });
  await fs.access(SAVED_STYLES_DIR, fsConstants.W_OK);

  try {
    await fs.access(USER_SAVED_FILE);
  } catch {
    await fs.writeFile(USER_SAVED_FILE, JSON.stringify({ styles: [] }, null, 2), 'utf8');
  }
  await fs.access(USER_SAVED_FILE, fsConstants.W_OK);

  try {
    await fs.access(DELETED_STYLES_FILE);
  } catch {
    await fs.writeFile(DELETED_STYLES_FILE, JSON.stringify({ styles: [] }, null, 2), 'utf8');
  }
  await fs.access(DELETED_STYLES_FILE, fsConstants.W_OK);
}

export async function readSuppliedStylesMap() {
  const suppliedStylesFile = await resolveSuppliedStylesFile();
  const raw = await fs.readFile(suppliedStylesFile, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

export async function readUserSavedStyles() {
  await ensureSavedStylesStorage();
  const raw = await fs.readFile(USER_SAVED_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  const styles = Array.isArray(parsed?.styles) ? parsed.styles : [];
  return styles
    .map(normalizeUserStyleRecord)
    .filter((item) => item.name && item.category);
}

export async function writeUserSavedStyles(styles) {
  await ensureSavedStylesStorage();
  const normalized = (styles || []).map(normalizeUserStyleRecord);
  await fs.writeFile(USER_SAVED_FILE, JSON.stringify({ styles: normalized }, null, 2), 'utf8');
}

export async function readDeletedSuppliedStyles() {
  await ensureSavedStylesStorage();
  const raw = await fs.readFile(DELETED_STYLES_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  const styles = Array.isArray(parsed?.styles) ? parsed.styles : [];
  return styles
    .map(normalizeDeletedRecord)
    .filter((item) => item.name && item.category);
}

export async function writeDeletedSuppliedStyles(styles) {
  await ensureSavedStylesStorage();
  const normalized = (styles || []).map(normalizeDeletedRecord);
  await fs.writeFile(DELETED_STYLES_FILE, JSON.stringify({ styles: normalized }, null, 2), 'utf8');
}

export function buildPromptFromStyles(styles) {
  const parts = [];
  const styleObj = styles && typeof styles === 'object' ? styles : {};
  Object.keys(styleObj)
    .sort((a, b) => a.localeCompare(b))
    .forEach((dimension) => {
      if (dimension === 'saved-styles') return;
      const groups = styleObj[dimension] || {};
      Object.keys(groups)
        .sort((a, b) => a.localeCompare(b))
        .forEach((groupName) => {
          const values = Array.isArray(groups[groupName]) ? groups[groupName] : [];
          if (values.length) {
            const title = String(groupName)
              .split(' ')
              .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
              .join(' ');
            parts.push(`${title}: ${values.join(', ')}`);
          }
        });
    });
  return parts.join(', ');
}

export async function copySavedStyleImage({ imageLocalPath, imageUrl, styleName }) {
  await ensureSavedStylesStorage();

  const stem = safeStem(styleName);
  const timestamp = Date.now();

  if (imageLocalPath) {
    const srcAbs = toAbsoluteDataRootPath(String(imageLocalPath).replace(/^\//, ''));
    const ext = extFromPath(srcAbs, '.png');
    const fileName = `${stem}-${timestamp}${ext}`;
    const destAbs = path.join(SAVED_STYLES_DIR, fileName);
    try {
      await fs.copyFile(srcAbs, destAbs);
    } catch (err) {
      if (err?.code === 'ENOENT') {
        throw new Error(`Saved style source image not found: ${srcAbs}`);
      }
      if (err?.code === 'EACCES' || err?.code === 'EPERM') {
        throw new Error(`Saved styles directory is not writable: ${SAVED_STYLES_DIR}`);
      }
      throw err;
    }
    return path.join('data', 'saved-styles', fileName).replace(/\\/g, '/');
  }

  if (imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch source image (${response.status})`);
    }
    const ext = extFromContentType(response.headers.get('content-type'));
    const fileName = `${stem}-${timestamp}${ext}`;
    const destAbs = path.join(SAVED_STYLES_DIR, fileName);
    const bytes = Buffer.from(await response.arrayBuffer());
    try {
      await fs.writeFile(destAbs, bytes);
    } catch (err) {
      if (err?.code === 'EACCES' || err?.code === 'EPERM') {
        throw new Error(`Saved styles directory is not writable: ${SAVED_STYLES_DIR}`);
      }
      throw err;
    }
    return path.join('data', 'saved-styles', fileName).replace(/\\/g, '/');
  }

  return null;
}

export async function getMergedSavedStyles() {
  const [suppliedMap, userStyles, deletedSupplied] = await Promise.all([
    readSuppliedStylesMap(),
    readUserSavedStyles(),
    readDeletedSuppliedStyles(),
  ]);

  const deletedSet = new Set(deletedSupplied.map((x) => styleKey(x.category, x.name)));

  const sections = [];
  const categoryIndex = new Map();

  Object.entries(suppliedMap || {}).forEach(([category, entries]) => {
    const items = (Array.isArray(entries) ? entries : [])
      .map((entry) => ({
        category,
        name: String(entry?.name || '').trim(),
        prompt: String(entry?.prompt || '').trim(),
        imagePath: null,
        styles: null,
        source: 'supplied',
        isUserStyle: false,
      }))
      .filter((entry) => entry.name && !deletedSet.has(styleKey(category, entry.name)));

    if (items.length) {
      categoryIndex.set(category, sections.length);
      sections.push({ title: category, items });
    }
  });

  userStyles.forEach((entry) => {
    const normalized = {
      category: entry.category,
      name: entry.name,
      prompt: entry.prompt,
      imagePath: entry.imagePath || null,
      styles: entry.styles || {},
      source: 'user',
      isUserStyle: true,
    };

    const idx = categoryIndex.get(entry.category);
    if (idx == null) {
      categoryIndex.set(entry.category, sections.length);
      sections.push({ title: entry.category, items: [normalized] });
    } else {
      sections[idx].items.push(normalized);
    }
  });

  sections.forEach((section) => {
    section.items.sort((a, b) => a.name.localeCompare(b.name));
  });

  return {
    sections,
    categories: sections.map((section) => section.title),
    suppliedMap,
    userStyles,
    deletedSupplied,
  };
}

export function ensureGlobalStyleNameUnique({ name, suppliedMap, userStyles, deletedSupplied, excludeUserName }) {
  const target = normalizeName(name);
  if (!target) return;

  const deletedSet = new Set((deletedSupplied || []).map((x) => styleKey(x.category, x.name)));

  for (const [category, entries] of Object.entries(suppliedMap || {})) {
    for (const entry of Array.isArray(entries) ? entries : []) {
      const suppliedName = String(entry?.name || '').trim();
      if (!suppliedName) continue;
      if (deletedSet.has(styleKey(category, suppliedName))) continue;
      if (normalizeName(suppliedName) === target) {
        throw new Error(`Style name \"${name}\" already exists.`);
      }
    }
  }

  for (const entry of userStyles || []) {
    const userName = String(entry?.name || '').trim();
    if (!userName) continue;
    if (excludeUserName && normalizeName(excludeUserName) === normalizeName(userName)) {
      continue;
    }
    if (normalizeName(userName) === target) {
      throw new Error(`Style name \"${name}\" already exists.`);
    }
  }
}

export function findUserStyleIndexByName(userStyles, name) {
  const target = normalizeName(name);
  return (userStyles || []).findIndex((entry) => normalizeName(entry?.name) === target);
}

export function removeDeletedSuppliedEntry(deletedStyles, { category, name }) {
  const target = styleKey(category, name);
  return (deletedStyles || []).filter((entry) => styleKey(entry.category, entry.name) !== target);
}

export function upsertDeletedSuppliedEntry(deletedStyles, { category, name }) {
  const next = removeDeletedSuppliedEntry(deletedStyles, { category, name });
  next.push({ category: normalizeCategory(category), name: String(name || '').trim(), deletedAt: new Date().toISOString() });
  return next;
}
