# Read Status: Investigation & Fixes

## Starting Problem

When clicking "Mark as read" on an article in obsidian-viewer:
- The article **header** correctly updated to show the read date
- The **sidebar** badges did **not** update immediately
- The **Showcase** page **never** reflected read status at all

Additionally: the header only showed the date last read, with no "days ago" label.

---

## Fix 1 — Immediate sidebar update on mark-as-read

**File:** `obsidian-viewer/templates/page.html`

**Problem:** `markAsRead()` only called `applyReadDotsToNav()` (to refresh sidebar badges) when `vaultReads` was already a non-null object. If the vault reads API had failed at page load time, `vaultReads` stayed `null`, the guard `if (vaultReads)` was false, and the sidebar never got updated after the mark.

**Fix:**
```javascript
// Before
if (vaultReads) {
  vaultReads[docPath] = { readCount: data.readCount, lastRead: data.lastRead };
  applyReadDotsToNav();
}

// After — always update regardless of prior load state
if (!vaultReads) vaultReads = {};
vaultReads[docPath] = { readCount: data.readCount, lastRead: data.lastRead };
applyReadDotsToNav();
updateShowcaseCards();
```

This made the sidebar correctly update immediately on click.

---

## Fix 2 — "Days ago" in article header

**File:** `obsidian-viewer/templates/page.html`

Added days-ago computation to both `loadDocReadStatus()` (on page load) and `markAsRead()` (on click):

```javascript
const days = Math.floor((Date.now() / 1000 - data.lastRead) / 86400);
const daysAgo = days === 0 ? 'today' : `${days} day${days !== 1 ? 's' : ''} ago`;
info.textContent = 'Read ' + data.readCount + '× · Last: '
  + new Date(data.lastRead * 1000).toLocaleDateString()
  + ' (' + daysAgo + ')';
```

Result: header now shows e.g. `Read 3× · Last: 4/28/2026 (5 days ago)`.

---

## Persistent bug: reads gone on refresh / never visible in Showcase

After Fix 1, the sidebar updated immediately after a click. But on refresh, or when viewing from another browser, or in the Showcase — read status was absent.

### Root Cause Discovered

`converter.js` derived `VAULT_NAME` from the output directory path:

```javascript
const vaultName = path.basename(vaultOutputRoot);
// Inside Docker: vaultOutputRoot = '/outputs/1'
// → vaultName = '1'
```

This meant every **article page** had `VAULT_NAME = '1'` baked into its JavaScript.

Meanwhile, `indexer.js` (which generates the index/home page) and `showcase.js` (the new Showcase page) both used `pair.name` — the configured human name like `'MyVault'`.

The reads database table stores rows keyed by `(user_id, vault_name, doc_path)`. So:

| Page type | VAULT_NAME used | Effect |
|---|---|---|
| Article pages | `'1'` | Reads stored/fetched under `'1'` |
| Index page | `'MyVault'` | Fetches vault `'MyVault'` → finds nothing |
| Showcase page | `'MyVault'` | Fetches vault `'MyVault'` → finds nothing |

This is why:
- Marking an article as read and immediately refreshing an **article page** appeared to work (both mark and fetch used vault `'1'`)
- But the **Showcase** always showed "Never Read" for every card
- The **sidebar** on the index/showcase page showed ⬤ (unread) for every article, even previously-read ones
- Viewing from another page (or another browser session navigating to the index) showed no read history

### Fix

**File:** `obsidian-viewer/src/converter.js` — Added `vaultName` as an explicit 4th parameter with a safe fallback:

```javascript
async function convertFile(inputAbsPath, outputAbsPath, vaultOutputRoot, vaultName) {
  ...
  const resolvedVaultName = vaultName || path.basename(vaultOutputRoot);
  ...
}
```

**File:** `obsidian-viewer/src/sync.js` — Pass `pair.name` in both `handleAdd` and `handleChange`:

```javascript
await convertFile(inputAbsPath, outputAbsPath.replace(/\.md$/, '.html'), pair.output, pair.name);
```

Now all page types — articles, index, showcase — use the same `VAULT_NAME = pair.name`. Marks from article pages are found by the index and showcase.

### Side Effect

Reads previously stored under vault `'1'` are orphaned by this change. After restarting the watcher (which regenerates all article HTML with the correct vault name), users will need to re-read articles once to rebuild read history under the new, correct vault key. There is no automatic migration.

---

## Summary of All Changed Files (this session)

| File | What changed |
|---|---|
| `obsidian-viewer/templates/page.html` | `markAsRead()` unconditionally updates sidebar; added "days ago" to header in both load and mark paths; `updateShowcaseCards()` called after mark |
| `obsidian-viewer/src/converter.js` | Added `vaultName` 4th parameter, uses it instead of `path.basename(vaultOutputRoot)` |
| `obsidian-viewer/src/sync.js` | Passes `pair.name` to `convertFile()` in `handleAdd` and `handleChange` |
