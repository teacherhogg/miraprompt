# MiraPrompt

MiraPrompt is a Dockerized monorepo with:
- miraprompt-ui: Quasar SPA for prompt composition.
- miraprompt-server: Express server scaffold for future persistence and generation.

## Phase 1 Included
- Category and subcategory selection from style JSON.
- Merged style controls (Global + Category + Subcategory).
- Accordion interface with grouped checkboxes.
- Popup JSON output of selected style settings.

## Run With Docker
1. Ensure .env exists (copy from .env.example if needed).
2. Start:

```bash
docker compose up --build
```

3. Open UI at http://localhost:9000
4. Health check server at http://localhost:3011/health

## Local Development
### UI
```bash
cd miraprompt-ui
npm install
npm run dev
```

### Server
```bash
cd miraprompt-server
npm install
npm run dev
```

## Persisted Data Path
Host path is controlled by MIRAPROMPT_DATA_DIR in .env and mounted to /app/data in the server container.
Backend host port is controlled by MIRAPROMPT_SERVER_PORT in .env and maps to container port 3001.

## Prompt Planning Files
- prompts/master-implementation-prompt.md
- prompts/phase-1-prompt.md
- prompts/phase-2-prompt.md
- prompts/phase-3-prompt.md
