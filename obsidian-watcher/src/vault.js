import { promises as fs } from 'fs';
import path from 'path';
import { updateManifest, buildIndex } from './index-builder.js';

export async function writeImageToVault(imagePath, markdownFilePath, jobName, config) {
  const attachmentsDir = path.join(config.vaultPath, config.attachmentsDir);
  await fs.mkdir(attachmentsDir, { recursive: true });

  const ext = path.extname(imagePath) || '.png';
  const slug = jobName.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const destFilename = `${slug}${ext}`;
  const destPath = path.join(attachmentsDir, destFilename);

  await fs.copyFile(imagePath, destPath);

  const original = await fs.readFile(markdownFilePath, 'utf-8');
  const link = `![[${destFilename}]]`;
  // Insert after the first H1 heading line, otherwise prepend to the top
  const h1Match = original.match(/^(#\s[^\n]*\n)/m);
  const updated = h1Match
    ? original.replace(h1Match[0], `${h1Match[0]}\n${link}\n\n`)
    : `${link}\n\n${original}`;
  await fs.writeFile(markdownFilePath, updated, 'utf-8');

  await updateManifest(destFilename, markdownFilePath, config);
  await buildIndex(config);

  return destPath;
}
