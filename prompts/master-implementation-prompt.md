# MiraPrompt Master Implementation Prompt

## Project Context
You are implementing a monorepo project named MiraPrompt with two applications:
1. miraprompt-ui: Quasar SPA frontend.
2. miraprompt-server: Express backend.

The project is Docker-first and orchestrated through docker-compose.

## Product Purpose
1. Provide a rich browser UI for crafting image generation prompts from curated style datasets.
2. Track style usage trends over time by category and individual style settings.
3. Send crafted prompts to generation providers (first fal.ai, then pluggable providers).

## Scope Rule
Implement only Phase 1 now. Keep architecture ready for Phase 2 and Phase 3.

## Architecture Requirements
- Keep frontend and backend in separate subfolders.
- Use a root docker-compose.yml.
- Use MIRAPROMPT_DATA_DIR from environment for persisted host storage.
- Mount persisted storage into the backend container for future prompt and image files.

## Data Requirements
- Use copied style data in frontend assets sourced from custom-styles.json.
- UI hierarchy:
  1. Category dropdown.
  2. Subcategory dropdown filtered by category.
  3. Accordion sections by style dimension.
  4. Grouped style options under subcategory/group names.
  5. Multi-select checkboxes for all options.

## Style Merge Behavior
Given category + subcategory:
- Include all Global styles.
- Include selected category styles.
- Include selected subcategory styles.
- Merge by union for overlapping dimensions/groups.
- Deduplicate repeated values.
- Resolve known category-name mismatches safely.

## Phase 1 Acceptance Criteria
- User can choose category and subcategory.
- User sees merged style options in accordion form.
- Option groups visually alternate background color for easy scanning.
- Checkbox rows are compact and responsive.
- A button opens a popup modal showing selected options only as JSON.
- No backend dependency is required for this workflow.

## Phase 2 Intent (Do not build yet)
- Persist prompt definitions to backend storage.
- Track usage metrics per category/style.
- Add image example sidebar, toggleable and context-aware.
- Introduce API contracts for prompt CRUD and analytics.

## Phase 3 Intent (Do not build yet)
- Add generation pipeline using fal.ai first.
- Add provider abstraction and support additional model APIs.
- Manage asynchronous generation jobs and output tracking.
- Store generated images and associated prompt metadata.

## Non-functional Requirements
- Responsive desktop and mobile behavior.
- Maintainable code with clear helper utilities.
- Docker build and startup should work for both services.
- Keep implementation deterministic and data-driven.
