import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDB } from './db/index.js';
import { seedDev } from './db/seed.js';
import adminRoutes from './routes/admin.js';
import sessionRoutes from './routes/session.js';
import aiRoutes from './routes/ai.js';
import projectRoutes from './routes/project.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/project', projectRoutes);

// Health check
app.get('/health', (_, res) => res.json({ ok: true }));

async function start() {
  await initDB();
  await seedDev();
  app.listen(PORT, () => console.log(`✓ Leistungsmatrix Backend läuft auf Port ${PORT}`));
}

start().catch(console.error);
