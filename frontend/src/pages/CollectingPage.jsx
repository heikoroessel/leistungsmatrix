import { useState, useRef, useEffect, useCallback } from 'react';
import { post } from '../api.js';

const AI_HINT_INTERVAL = 10; // nach je 10 Kärtchen

export default function CollectingPage({ session, project, cards, setCards, onFinish }) {
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [aiHint, setAiHint] = useState(null);
  const [aiHintLoading, setAiHintLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(cards.length === 0);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const saveTimer = useRef(null);
  const inputRef = useRef(null);
  const lastHintAt = useRef(0);

  // Autosave debounced
  const scheduleSave = useCallback((updatedCards) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await post('/api/session/cards', {
          session_token: session.session_token,
          cards: updatedCards.map(c => c.text)
        });
      } catch (e) {
        console.warn('Autosave failed:', e);
      }
    }, 800);
  }, [session.session_token]);

  // KI-Reflexionsfrage nach je 10 Kärtchen
  useEffect(() => {
    const count = cards.length;
    if (count > 0 && count % AI_HINT_INTERVAL === 0 && count !== lastHintAt.current) {
      lastHintAt.current = count;
      fetchAiHint(cards);
    }
  }, [cards.length]);

  const fetchAiHint = async (currentCards) => {
    setAiHintLoading(true);
    try {
      // We call the backend analyze endpoint, but just to get a hint question
      // We use a lightweight direct prompt via backend
      const response = await post('/api/ai/hint', {
        session_token: session.session_token,
        cards: currentCards.map(c => c.text)
      });
      if (response.hint) setAiHint(response.hint);
    } catch {
      // Fallback hints if endpoint doesn't exist yet
      const fallbacks = [
        'Sie haben bisher einige Tätigkeiten erfasst – gibt es auch operative Alltagsaufgaben, die Sie regelmäßig ausführen?',
        'Haben Sie Tätigkeiten in der Kommunikation mit Kunden oder Lieferanten?',
        'Gibt es Tätigkeiten in der Dokumentation oder Berichterstattung?',
        'Planen oder koordinieren Sie regelmäßig Abläufe – haben Sie das bereits erfasst?'
      ];
      setAiHint(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
    } finally {
      setAiHintLoading(false);
    }
  };

  const addCard = () => {
    const text = input.trim();
    if (!text) return;

    const newCard = {
      id: `local-${Date.now()}`,
      text,
      isLocal: true
    };
    const updated = [...cards, newCard];
    setCards(updated);
    setInput('');
    scheduleSave(updated);
    inputRef.current?.focus();
  };

  const removeCard = (id) => {
    const updated = cards.filter(c => c.id !== id);
    setCards(updated);
    scheduleSave(updated);
  };

  const startEdit = (card) => {
    setEditingId(card.id);
    setEditValue(card.text || card.raw_text || '');
  };

  const saveEdit = () => {
    if (!editValue.trim()) return;
    const updated = cards.map(c =>
      c.id === editingId ? { ...c, text: editValue.trim(), raw_text: editValue.trim() } : c
    );
    setCards(updated);
    scheduleSave(updated);
    setEditingId(null);
    setEditValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addCard();
  };

  const handleFinish = async () => {
    if (cards.length < 3) return;
    setFinishing(true);
    try {
      // Final save
      await post('/api/session/cards', {
        session_token: session.session_token,
        cards: cards.map(c => c.text || c.raw_text)
      });
      // Finish collecting
      const result = await post('/api/session/finish-collecting', {
        session_token: session.session_token
      });
      onFinish(result.cards || cards);
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setFinishing(false);
    }
  };

  const cardText = (c) => c.text || c.raw_text || '';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

      {/* Onboarding */}
      {showOnboarding && (
        <div className="fade-in" style={{
          background: 'var(--accent-light)',
          border: '1px solid #c5d8f5',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          marginBottom: 32,
          position: 'relative'
        }}>
          <button
            onClick={() => setShowOnboarding(false)}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-muted)', fontSize: 18, lineHeight: 1
            }}
            aria-label="Schließen"
          >×</button>
          <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7, margin: 0 }}>
            <strong style={{ fontWeight: 600 }}>So geht's:</strong> Schreiben Sie kurze Tätigkeiten – so wie Sie sie tun würden.
            Zum Beispiel: <em>„Rasenmähen"</em>, <em>„Angebote schreiben"</em>, <em>„Mitarbeitermeeting"</em>.
            Ein Kärtchen pro Tätigkeit. Erfahrungsgemäß kommen 20 bis 50 Kärtchen zusammen.
          </p>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', color: 'var(--ink-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
          Stufe 1 — Erfassen
        </p>
        <h2 style={{ fontSize: '1.75rem', marginBottom: 0 }}>Was machst du?</h2>
      </div>

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 24,
        background: 'var(--surface-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <input
          ref={inputRef}
          className="input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tätigkeit eingeben …"
          style={{
            border: 'none',
            background: 'transparent',
            boxShadow: 'none',
            padding: '4px 0',
            fontSize: 15
          }}
          autoFocus
        />
        <button
          className="btn btn-primary"
          onClick={addCard}
          disabled={!input.trim()}
          style={{ flexShrink: 0 }}
        >
          + Hinzufügen
        </button>
      </div>

      {/* KI-Hinweis */}
      {(aiHint || aiHintLoading) && (
        <div className="fade-in" style={{
          background: '#fdfbf7',
          border: '1px solid #e8dfc8',
          borderRadius: 'var(--radius)',
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💬</span>
          {aiHintLoading ? (
            <span style={{ fontSize: 14, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
              Reflexionsfrage wird generiert …
            </span>
          ) : (
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, color: 'var(--ink)', margin: 0, fontStyle: 'italic' }}>
                {aiHint}
              </p>
            </div>
          )}
          {!aiHintLoading && (
            <button
              onClick={() => setAiHint(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ink-muted)', fontSize: 16, flexShrink: 0
              }}
            >×</button>
          )}
        </div>
      )}

      {/* Cards grid */}
      {cards.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14
          }}>
            <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
              {cards.length} Kärtchen {cards.length < 20 ? `— noch ${20 - cards.length} bis Richtwert` : ''}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 10
          }}>
            {cards.map((card, i) => (
              <div
                key={card.id}
                className="fade-in"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '12px 14px',
                  position: 'relative',
                  boxShadow: 'var(--shadow-sm)',
                  minHeight: 56,
                  display: 'flex',
                  alignItems: 'center',
                  animationDelay: `${Math.min(i * 20, 200)}ms`
                }}
              >
                {editingId === card.id ? (
                  <input
                    className="input"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    onBlur={saveEdit}
                    autoFocus
                    style={{
                      border: 'none', background: 'transparent', boxShadow: 'none',
                      padding: '0', fontSize: 14, width: '100%'
                    }}
                  />
                ) : (
                  <>
                    <span style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.4, flex: 1 }}>
                      {cardText(card)}
                    </span>
                    <div style={{
                      position: 'absolute',
                      top: 4, right: 4,
                      display: 'none',
                      gap: 2
                    }}
                      className="card-actions"
                    >
                      <button
                        onClick={() => startEdit(card)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--ink-muted)', fontSize: 12, padding: '2px 4px',
                          borderRadius: 3
                        }}
                        title="Bearbeiten"
                      >✎</button>
                      <button
                        onClick={() => removeCard(card.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#c0392b', fontSize: 12, padding: '2px 4px',
                          borderRadius: 3
                        }}
                        title="Löschen"
                      >✕</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {cards.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 24px',
          color: 'var(--ink-muted)'
        }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>◻◻◻</div>
          <p style={{ fontSize: 14 }}>Noch keine Kärtchen — fangen Sie einfach an.</p>
        </div>
      )}

      {/* Finish button */}
      <div style={{
        borderTop: '1px solid var(--border)',
        paddingTop: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
          {cards.length < 3
            ? 'Mindestens 3 Kärtchen zum Abschließen'
            : `${cards.length} Kärtchen bereit zur Bereinigung`}
        </p>
        <button
          className="btn btn-primary btn-lg"
          disabled={cards.length < 3 || finishing}
          onClick={handleFinish}
        >
          {finishing
            ? <><span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Wird abgeschlossen …</>
            : 'Kärtchen abschließen →'}
        </button>
      </div>

      <style>{`
        .card:hover .card-actions { display: flex !important; }
        div[style*="minHeight: 56px"]:hover .card-actions { display: flex !important; }
      `}</style>
    </div>
  );
}
