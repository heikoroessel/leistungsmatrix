import express from 'express';
import { pool } from '../db/index.js';

const router = express.Router();

// POST /api/ai/analyze — KI analysiert alle Kärtchen einer Session
router.post('/analyze', async (req, res) => {
  const { session_token } = req.body;

  try {
    const session = await pool.query('SELECT * FROM sessions WHERE session_token = $1', [session_token]);
    if (!session.rows.length) return res.status(404).json({ error: 'Session nicht gefunden' });
    const s = session.rows[0];

    const cardsResult = await pool.query(
      'SELECT * FROM cards WHERE session_id = $1 ORDER BY sort_order',
      [s.id]
    );
    const cards = cardsResult.rows;

    if (!cards.length) return res.status(400).json({ error: 'Keine Kärtchen gefunden' });

    // KI-Analyse aller Kärtchen in einem Call
    const cardList = cards.map((c, i) => `${i + 1}. "${c.raw_text}"`).join('\n');

    const prompt = `Du analysierst Tätigkeitsbeschreibungen aus einer Leistungsmatrix-Methode nach Rössel (2011).
Ziel: Jedes Kärtchen soll ein klares VERB (Tätigkeit) und ein klares OBJEKT (woran gearbeitet wird) haben.

Analysiere jedes Kärtchen und bestimme:
- verb: die Kerntätigkeit (Infinitiv, z.B. "schneiden", "erstellen", "administrieren")
- object: das Kernobjekt (Nomen, z.B. "Haare", "Angebot", "Server")
- status: "clean" wenn beides eindeutig, "needs_review" wenn etwas fehlt oder unklar
- ai_note: nur bei "needs_review" — eine kurze, präzise Frage an den Nutzer (max. 1 Satz), keine Erklärung
- dimension: "werkstatt" (Kernleistung), "shop" (Vertrieb/Kunden), "meta" (Führung/Steuerung) oder "parked" wenn unklar

Regeln:
- Kompositwörter auflösen: "Workshopteilnahme" → fehlendes Verb, Frage: "Was tust du im Workshop konkret?"
- Adjektive/Adverbien ignorieren: "schnelles Tippen" → verb: tippen, object: (fehlt, Frage stellen)
- Eindeutige Kompositwörter erkennen: "Rasenmähen" → verb: mähen, object: Rasen ✓
- Shop-Kärtchen: alles rund um Angebote, Kunden, Verträge, Reklamationen
- Meta-Kärtchen: Führung, Meetings, Kennzahlen, Personal, Strategie

Antworte NUR mit einem JSON-Array, kein Markdown, keine Erklärung:
[
  {
    "index": 1,
    "verb": "...",
    "object": "...",
    "status": "clean|needs_review",
    "ai_note": "...",
    "dimension": "werkstatt|shop|meta|parked"
  }
]

Kärtchen:
${cardList}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20251101',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    // JSON parsen
    const clean = text.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(clean);

    // Ergebnis mit Card-IDs zusammenführen
    const result = analysis.map(a => ({
      ...a,
      id: cards[a.index - 1]?.id,
      raw_text: cards[a.index - 1]?.raw_text
    }));

    res.json({ ok: true, analysis: result });
  } catch (err) {
    console.error('AI analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/clarify — KI beantwortet eine einzelne Klärungsfrage
router.post('/clarify', async (req, res) => {
  const { card_id, raw_text, user_answer, current_verb, current_object } = req.body;

  try {
    const prompt = `Du hilfst bei der Leistungsmatrix-Bereinigung nach Rössel (2011).

Originalkärtchen: "${raw_text}"
${current_verb ? `Bisheriges Verb: "${current_verb}"` : 'Verb: fehlt'}
${current_object ? `Bisheriges Objekt: "${current_object}"` : 'Objekt: fehlt'}
Antwort des Nutzers: "${user_answer}"

Leite daraus das finale Verb und Objekt ab. Antworte NUR mit JSON, kein Markdown:
{
  "verb": "...",
  "object": "...",
  "dimension": "werkstatt|shop|meta",
  "status": "clean"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20251101',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(text);

    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
