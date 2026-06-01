import express from 'express';
import { pool } from '../db/index.js';

const router = express.Router();

// POST /api/project/view — AN-Key oder TN-Key → Projektübersicht
router.post('/view', async (req, res) => {
  const { key } = req.body;

  try {
    // AN-Key prüfen
    let proj = await pool.query('SELECT * FROM projects WHERE an_key = $1', [key]);
    const isAnalyst = proj.rows.length > 0;

    // TN-Key prüfen (für "Done"-Sessions)
    if (!isAnalyst) {
      proj = await pool.query('SELECT * FROM projects WHERE tn_key = $1', [key]);
    }

    if (!proj.rows.length) return res.status(404).json({ error: 'Ungültiger Key' });
    const project = proj.rows[0];

    // Alle abgeschlossenen Sessions
    const sessions = await pool.query(
      `SELECT s.*, COUNT(c.id) as card_count
       FROM sessions s
       LEFT JOIN cards c ON c.session_id = s.id
       WHERE s.project_id = $1
       GROUP BY s.id
       ORDER BY s.created_at`,
      [project.id]
    );

    // Alle bereinigten Kärtchen (nur von done-Sessions)
    const cards = await pool.query(
      `SELECT c.*, s.participant_label
       FROM cards c
       JOIN sessions s ON s.id = c.session_id
       WHERE c.project_id = $1 AND s.phase = 'done'
       ORDER BY s.participant_label, c.sort_order`,
      [project.id]
    );

    res.json({
      project: { id: project.id, name: project.name },
      sessions: sessions.rows,
      cards: cards.rows,
      isAnalyst
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
