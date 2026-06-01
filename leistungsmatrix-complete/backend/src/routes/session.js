import express from 'express';
import { pool } from '../db/index.js';
import { nanoid } from '../utils/keys.js';

const router = express.Router();

// POST /api/session/start — TN-Key einlösen, Session erstellen oder wiederfinden
router.post('/start', async (req, res) => {
  const { tn_key, session_token } = req.body;

  try {
    // Projekt aus TN-Key finden
    const proj = await pool.query('SELECT * FROM projects WHERE tn_key = $1', [tn_key]);
    if (!proj.rows.length) return res.status(404).json({ error: 'Ungültiger Key' });
    const project = proj.rows[0];

    // Wenn session_token mitgeschickt: vorhandene Session laden
    if (session_token) {
      const existing = await pool.query(
        'SELECT * FROM sessions WHERE session_token = $1 AND project_id = $2',
        [session_token, project.id]
      );
      if (existing.rows.length) {
        const session = existing.rows[0];
        // Kärtchen laden
        const cards = await pool.query(
          'SELECT * FROM cards WHERE session_id = $1 ORDER BY sort_order, created_at',
          [session.id]
        );
        return res.json({ session, project: { id: project.id, name: project.name }, cards: cards.rows });
      }
    }

    // Neue Session anlegen
    // Teilnehmer-Label: A, B, C... basierend auf Anzahl Sessions im Projekt
    const count = await pool.query('SELECT COUNT(*) FROM sessions WHERE project_id = $1', [project.id]);
    const labelIndex = parseInt(count.rows[0].count);
    const label = String.fromCharCode(65 + labelIndex); // A=65

    const token = nanoid(12);
    const session = await pool.query(
      'INSERT INTO sessions (project_id, session_token, participant_label) VALUES ($1, $2, $3) RETURNING *',
      [project.id, token, `Teilnehmer ${label}`]
    );

    res.json({
      session: session.rows[0],
      project: { id: project.id, name: project.name },
      cards: []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/session/cards — Kärtchen speichern (während Eingabe, autosave)
router.post('/cards', async (req, res) => {
  const { session_token, cards } = req.body;

  try {
    const session = await pool.query('SELECT * FROM sessions WHERE session_token = $1', [session_token]);
    if (!session.rows.length) return res.status(404).json({ error: 'Session nicht gefunden' });
    const s = session.rows[0];

    if (s.phase !== 'collecting') {
      return res.status(400).json({ error: 'Erfassung bereits abgeschlossen' });
    }

    // Alle bestehenden Kärtchen dieser Session löschen und neu schreiben (simple replace)
    await pool.query('DELETE FROM cards WHERE session_id = $1', [s.id]);

    if (cards?.length) {
      const values = cards.map((text, i) => `('${s.id}', '${s.project_id}', $${i + 1}, ${i})`).join(',');
      const texts = cards.map(c => c.trim()).filter(Boolean);
      if (texts.length) {
        // Parametrized insert
        const placeholders = texts.map((_, i) => `($1, $2, $${i + 3}, ${i})`).join(',');
        await pool.query(
          `INSERT INTO cards (session_id, project_id, raw_text, sort_order) VALUES ${placeholders}`,
          [s.id, s.project_id, ...texts]
        );
      }
    }

    res.json({ ok: true, count: cards?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/session/finish-collecting — Erfassung abschließen, Phase → reviewing
router.post('/finish-collecting', async (req, res) => {
  const { session_token } = req.body;

  try {
    const session = await pool.query('SELECT * FROM sessions WHERE session_token = $1', [session_token]);
    if (!session.rows.length) return res.status(404).json({ error: 'Session nicht gefunden' });
    const s = session.rows[0];

    // Phase updaten
    await pool.query('UPDATE sessions SET phase = $1 WHERE id = $2', ['reviewing', s.id]);

    // Kärtchen laden für KI-Analyse
    const cards = await pool.query(
      'SELECT * FROM cards WHERE session_id = $1 ORDER BY sort_order',
      [s.id]
    );

    res.json({ ok: true, cards: cards.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/session/save-reviewed — Bereinigung abschließen, Phase → done
router.post('/save-reviewed', async (req, res) => {
  const { session_token, cards } = req.body;
  // cards = [{ id, verb, object, status, ai_note, dimension }]

  try {
    const session = await pool.query('SELECT * FROM sessions WHERE session_token = $1', [session_token]);
    if (!session.rows.length) return res.status(404).json({ error: 'Session nicht gefunden' });
    const s = session.rows[0];

    // Alle Kärtchen updaten
    for (const card of cards) {
      await pool.query(
        `UPDATE cards SET verb = $1, object = $2, status = $3, ai_note = $4, dimension = $5
         WHERE id = $6 AND session_id = $7`,
        [card.verb, card.object, card.status, card.ai_note, card.dimension || 'werkstatt', card.id, s.id]
      );
    }

    await pool.query('UPDATE sessions SET phase = $1 WHERE id = $2', ['done', s.id]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
