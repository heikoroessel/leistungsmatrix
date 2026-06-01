import express from 'express';
import { pool } from '../db/index.js';
import { nanoid } from '../utils/keys.js';

const router = express.Router();

// Admin password middleware
router.use((req, res, next) => {
  const pw = req.headers['x-admin-password'] || req.body?.adminPassword;
  if (pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// GET all projects
router.get('/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
        COUNT(DISTINCT s.id) as session_count,
        COUNT(DISTINCT c.id) as card_count
      FROM projects p
      LEFT JOIN sessions s ON s.project_id = p.id
      LEFT JOIN cards c ON c.project_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create project
router.post('/projects', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const tn_key = 'TN-' + nanoid(6).toUpperCase();
  const an_key = 'AN-' + nanoid(6).toUpperCase();

  try {
    const result = await pool.query(
      'INSERT INTO projects (name, tn_key, an_key) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), tn_key, an_key]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE project
router.delete('/projects/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET project detail (sessions, cards overview)
router.get('/projects/:id', async (req, res) => {
  try {
    const proj = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!proj.rows.length) return res.status(404).json({ error: 'Not found' });

    const sessions = await pool.query(
      'SELECT * FROM sessions WHERE project_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    res.json({ ...proj.rows[0], sessions: sessions.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
