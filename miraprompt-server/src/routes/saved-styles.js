import { Router } from 'express';
import {
  ensureSavedStylesStorage,
  readUserSavedStyles,
  writeUserSavedStyles,
  readDeletedSuppliedStyles,
  writeDeletedSuppliedStyles,
  getMergedSavedStyles,
  ensureGlobalStyleNameUnique,
  buildPromptFromStyles,
  copySavedStyleImage,
  findUserStyleIndexByName,
  upsertDeletedSuppliedEntry,
} from '../saved-styles.js';

const router = Router();

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function normalizeStyles(styles) {
  return styles && typeof styles === 'object' ? styles : {};
}

function normalizeCategory(category) {
  return String(category || '').trim();
}

function normalizeName(name) {
  return String(name || '').trim();
}

function toResponseStyle(style) {
  return {
    category: style.category,
    name: style.name,
    prompt: style.prompt,
    imagePath: style.imagePath || null,
    styles: style.styles || {},
    source: style.source || (style.isUserStyle ? 'user' : 'supplied'),
    isUserStyle: Boolean(style.isUserStyle),
  };
}

router.get('/', async (_req, res) => {
  try {
    await ensureSavedStylesStorage();
    const merged = await getMergedSavedStyles();
    res.json({
      sections: merged.sections,
      categories: merged.categories,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load saved styles' });
  }
});

router.post('/', async (req, res) => {
  try {
    await ensureSavedStylesStorage();

    const name = normalizeName(req.body?.name);
    const category = normalizeCategory(req.body?.category);
    if (!name) return badRequest(res, 'name is required');
    if (!category) return badRequest(res, 'category is required');

    const styles = normalizeStyles(req.body?.styles);
    const imageLocalPath = req.body?.imageLocalPath ? String(req.body.imageLocalPath) : null;
    const imageUrl = req.body?.imageUrl ? String(req.body.imageUrl) : null;
    const prompt = String(req.body?.prompt || '').trim() || buildPromptFromStyles(styles);

    const [userStyles, merged] = await Promise.all([
      readUserSavedStyles(),
      getMergedSavedStyles(),
    ]);

    ensureGlobalStyleNameUnique({
      name,
      suppliedMap: merged.suppliedMap,
      userStyles,
      deletedSupplied: merged.deletedSupplied,
    });

    const imagePath = await copySavedStyleImage({
      imageLocalPath,
      imageUrl,
      styleName: name,
    });

    const record = {
      name,
      category,
      prompt,
      imagePath,
      styles,
      source: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    userStyles.push(record);
    await writeUserSavedStyles(userStyles);

    const refreshed = await getMergedSavedStyles();
    res.status(201).json({
      style: toResponseStyle({ ...record, isUserStyle: true }),
      sections: refreshed.sections,
      categories: refreshed.categories,
    });
  } catch (err) {
    if (/already exists/i.test(String(err?.message || ''))) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Failed to create saved style' });
  }
});

router.patch('/', async (req, res) => {
  try {
    await ensureSavedStylesStorage();

    const original = req.body?.original || {};
    const nextData = req.body?.next || {};

    const originalName = normalizeName(original.name);
    const originalCategory = normalizeCategory(original.category);
    const isUserStyle = Boolean(original.isUserStyle);

    if (!originalName) return badRequest(res, 'original.name is required');
    if (!originalCategory) return badRequest(res, 'original.category is required');

    const nextName = normalizeName(nextData.name || originalName);
    const nextCategory = normalizeCategory(nextData.category || originalCategory);
    if (!nextName) return badRequest(res, 'next.name is required');
    if (!nextCategory) return badRequest(res, 'next.category is required');

    const userStyles = await readUserSavedStyles();
    let deletedSupplied = await readDeletedSuppliedStyles();
    const merged = await getMergedSavedStyles();

    const nextStyles = nextData.styles !== undefined ? normalizeStyles(nextData.styles) : null;
    const hasNewImageRef = Boolean(nextData.imageLocalPath || nextData.imageUrl);

    if (isUserStyle) {
      const index = findUserStyleIndexByName(userStyles, originalName);
      if (index < 0) {
        return res.status(404).json({ error: 'User saved style not found' });
      }

      ensureGlobalStyleNameUnique({
        name: nextName,
        suppliedMap: merged.suppliedMap,
        userStyles,
        deletedSupplied,
        excludeUserName: originalName,
      });

      const existing = userStyles[index];
      const updatedStyles = nextStyles ?? existing.styles ?? {};
      const updatedPrompt = String(nextData.prompt || '').trim() || buildPromptFromStyles(updatedStyles);
      let imagePath = existing.imagePath || null;
      if (hasNewImageRef) {
        imagePath = await copySavedStyleImage({
          imageLocalPath: nextData.imageLocalPath ? String(nextData.imageLocalPath) : null,
          imageUrl: nextData.imageUrl ? String(nextData.imageUrl) : null,
          styleName: nextName,
        });
      }

      userStyles[index] = {
        ...existing,
        name: nextName,
        category: nextCategory,
        prompt: updatedPrompt,
        styles: updatedStyles,
        imagePath,
        updatedAt: new Date().toISOString(),
      };

      await writeUserSavedStyles(userStyles);
    } else {
      const suppliedEntries = Array.isArray(merged.suppliedMap?.[originalCategory])
        ? merged.suppliedMap[originalCategory]
        : [];
      const suppliedExists = suppliedEntries.some((entry) => normalizeName(entry?.name) === normalizeName(originalName));
      if (!suppliedExists) {
        return res.status(404).json({ error: 'Supplied saved style not found' });
      }

      deletedSupplied = upsertDeletedSuppliedEntry(deletedSupplied, {
        category: originalCategory,
        name: originalName,
      });

      const existingIndex = findUserStyleIndexByName(userStyles, nextName);
      ensureGlobalStyleNameUnique({
        name: nextName,
        suppliedMap: merged.suppliedMap,
        userStyles,
        deletedSupplied,
        excludeUserName: existingIndex >= 0 ? userStyles[existingIndex]?.name : null,
      });

      const baseStyles = nextStyles ?? {};
      const prompt = String(nextData.prompt || '').trim() || buildPromptFromStyles(baseStyles);
      let imagePath = null;
      if (hasNewImageRef) {
        imagePath = await copySavedStyleImage({
          imageLocalPath: nextData.imageLocalPath ? String(nextData.imageLocalPath) : null,
          imageUrl: nextData.imageUrl ? String(nextData.imageUrl) : null,
          styleName: nextName,
        });
      }

      const record = {
        name: nextName,
        category: nextCategory,
        prompt,
        styles: baseStyles,
        imagePath,
        source: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        userStyles[existingIndex] = {
          ...userStyles[existingIndex],
          ...record,
          createdAt: userStyles[existingIndex].createdAt || record.createdAt,
        };
      } else {
        userStyles.push(record);
      }

      await Promise.all([
        writeUserSavedStyles(userStyles),
        writeDeletedSuppliedStyles(deletedSupplied),
      ]);
    }

    const refreshed = await getMergedSavedStyles();
    res.json({
      sections: refreshed.sections,
      categories: refreshed.categories,
    });
  } catch (err) {
    if (/already exists/i.test(String(err?.message || ''))) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Failed to update saved style' });
  }
});

router.delete('/', async (req, res) => {
  try {
    await ensureSavedStylesStorage();

    const name = normalizeName(req.body?.name);
    const category = normalizeCategory(req.body?.category);
    const isUserStyle = Boolean(req.body?.isUserStyle);

    if (!name) return badRequest(res, 'name is required');
    if (!category) return badRequest(res, 'category is required');

    const userStyles = await readUserSavedStyles();
    let deletedSupplied = await readDeletedSuppliedStyles();

    if (isUserStyle) {
      const index = findUserStyleIndexByName(userStyles, name);
      if (index < 0) {
        return res.status(404).json({ error: 'User saved style not found' });
      }
      userStyles.splice(index, 1);
      await writeUserSavedStyles(userStyles);
    } else {
      deletedSupplied = upsertDeletedSuppliedEntry(deletedSupplied, { category, name });
      await writeDeletedSuppliedStyles(deletedSupplied);
    }

    const refreshed = await getMergedSavedStyles();
    res.json({
      sections: refreshed.sections,
      categories: refreshed.categories,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete saved style' });
  }
});

export default router;
