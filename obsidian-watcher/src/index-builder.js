import { promises as fs } from 'fs';
import path from 'path';

function manifestPath(config) {
  return path.join(config.vaultPath, config.attachmentsDir, '.manifest.json');
}

export async function updateManifest(imageFilename, markdownFilePath, config) {
  const mPath = manifestPath(config);
  let manifest = {};
  try {
    manifest = JSON.parse(await fs.readFile(mPath, 'utf-8'));
  } catch {}

  const rel = path.relative(config.vaultPath, markdownFilePath);
  const parts = rel.split(path.sep);
  const basename = path.basename(rel, path.extname(rel));
  const title = basename.replace(/[-_]+/g, ' ').toLowerCase();
  const category = parts.length > 1 ? parts[0] : null;
  const subcategory = parts.length > 2 ? parts[1] : null;

  manifest[imageFilename] = { markdownPath: rel, title, category, subcategory };

  const tmp = mPath + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(manifest, null, 2), 'utf-8');
  await fs.rename(tmp, mPath);
}

export async function buildIndex(config) {
  const mPath = manifestPath(config);
  let manifest = {};
  try {
    manifest = JSON.parse(await fs.readFile(mPath, 'utf-8'));
  } catch {
    return;
  }

  const attachmentsDir = path.join(config.vaultPath, config.attachmentsDir);

  // Filter to entries whose image still exists, then group
  const groups = new Map(); // category → Map(subcategory → entries[])
  for (const [imageFile, entry] of Object.entries(manifest)) {
    try {
      await fs.access(path.join(attachmentsDir, imageFile));
    } catch {
      continue;
    }
    const cat = entry.category || '(Uncategorized)';
    const sub = entry.subcategory || '';
    if (!groups.has(cat)) groups.set(cat, new Map());
    const subs = groups.get(cat);
    if (!subs.has(sub)) subs.set(sub, []);
    subs.get(sub).push({ imageFile, ...entry });
  }

  if (groups.size === 0) return;

  const sortedCats = [...groups.keys()].sort((a, b) => a.localeCompare(b));

  const sectionsHtml = sortedCats.map((cat) => {
    const subs = groups.get(cat);
    const sortedSubs = [...subs.keys()].sort((a, b) => a.localeCompare(b));

    const subHtml = sortedSubs.map((sub) => {
      const entries = subs.get(sub).sort((a, b) => a.title.localeCompare(b.title));
      const cardsHtml = entries.map(({ imageFile, markdownPath, title, category, subcategory }) => {
        const imgSrc = `./${config.attachmentsDir}/${imageFile}`;
        const mdLink = `./${markdownPath.replace(/\\/g, '/').replace(/\.md$/, '.html')}`;
        const metaText = [category, subcategory].filter(Boolean).join(' › ');
        return `
        <a class="card" href="${mdLink}">
          <img src="${imgSrc}" loading="lazy" alt="${escHtml(title)}">
          <div class="caption">
            <div class="title">${escHtml(title)}</div>
            <div class="meta">${escHtml(metaText)}</div>
          </div>
        </a>`;
      }).join('');

      const subHeading = sub ? `<h3 class="subcat-heading">${escHtml(sub)}</h3>` : '';
      return `
      <div class="subcategory">
        ${subHeading}
        <div class="grid">${cardsHtml}
        </div>
      </div>`;
    }).join('');

    return `
    <section class="category">
      <h2 class="cat-heading">${escHtml(cat)}</h2>
      ${subHtml}
    </section>`;
  }).join('');

  const totalCount = [...groups.values()].flatMap((s) => [...s.values()]).flat().length;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Obsidian Vault — Image Gallery</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --surface-hover: #22263a;
    --border: #2a2e42;
    --text-primary: #e8eaf0;
    --text-secondary: #8b90a8;
    --accent: #6c7ee1;
    --cat-color: #c9d1f7;
    --subcat-color: #8b90a8;
    --radius: 10px;
    --shadow: 0 4px 20px rgba(0,0,0,0.5);
    --shadow-hover: 0 8px 32px rgba(0,0,0,0.7);
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text-primary);
    line-height: 1.5;
    padding: 2rem 1.5rem 4rem;
  }

  header {
    max-width: 1400px;
    margin: 0 auto 2.5rem;
    border-bottom: 1px solid var(--border);
    padding-bottom: 1.25rem;
    display: flex;
    align-items: baseline;
    gap: 1rem;
  }

  header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  header .count {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  main { max-width: 1400px; margin: 0 auto; }

  .category { margin-bottom: 3rem; }

  .cat-heading {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--cat-color);
    letter-spacing: 0.02em;
    margin-bottom: 1.25rem;
    padding-left: 0.1rem;
    border-left: 3px solid var(--accent);
    padding-left: 0.75rem;
  }

  .subcategory { margin-bottom: 2rem; }

  .subcat-heading {
    font-size: 0.9rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--subcat-color);
    margin-bottom: 0.85rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
  }

  .card {
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    box-shadow: var(--shadow);
    transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  }

  .card:hover {
    transform: translateY(-3px) scale(1.015);
    box-shadow: var(--shadow-hover);
    background: var(--surface-hover);
  }

  .card img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    display: block;
    background: var(--border);
  }

  .caption {
    padding: 0.65rem 0.75rem 0.75rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .title {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-primary);
    text-transform: capitalize;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .meta {
    font-size: 0.72rem;
    color: var(--text-secondary);
    margin-top: auto;
  }
</style>
</head>
<body>
<header>
  <h1>Obsidian Vault</h1>
  <span class="count">${totalCount} article${totalCount !== 1 ? 's' : ''}</span>
</header>
<main>
  ${sectionsHtml}
</main>
</body>
</html>`;

  const indexPath = path.join(config.vaultPath, 'Showcase.html');
  const tmp = indexPath + '.tmp';
  await fs.writeFile(tmp, html, 'utf-8');
  await fs.rename(tmp, indexPath);
}

function escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
