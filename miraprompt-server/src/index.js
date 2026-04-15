import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ensureJobsDir } from './jobs.js';
import { ensureSavedStylesStorage } from './saved-styles.js';
import jobsRouter from './routes/jobs.js';
import savedStylesRouter from './routes/saved-styles.js';
import { MODEL_CATALOG } from './models.js';
import { getDataDir } from './paths.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = getDataDir();

app.use(cors());
app.use(express.json());
app.use('/data', express.static(DATA_DIR));

app.get('/health', (_req, res) => {
  res.json({
    service: 'miraprompt-server',
    status: 'ok',
    phase: 3,
  });
});

app.get('/api/providers', (_req, res) => {
  res.json({
    providers: [
      {
        id: 'fal-ai',
        enabled: Boolean(process.env.FAL_KEY),
        note: process.env.FAL_KEY ? 'Fal.ai configured' : 'Set FAL_KEY to enable generation',
      },
    ],
  });
});

app.get('/api/models', (_req, res) => {
  res.json({
    provider: 'fal-ai',
    models: MODEL_CATALOG.map((m) => ({
      id: m.id,
      provider: m.provider,
      settings: m.settings,
      specificOptions: m.specificOptions || [],
    })),
  });
});

app.use('/api/jobs', jobsRouter);
app.use('/api/saved-styles', savedStylesRouter);

async function start() {
  await ensureJobsDir();
  await ensureSavedStylesStorage();
  app.listen(PORT, () => {
    console.log(`miraprompt-server listening on port ${PORT}`);
  });
}

start();
