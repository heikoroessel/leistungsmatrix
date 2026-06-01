import { useState, useEffect, useRef } from 'react';
import { post } from '../api.js';

const DIMENSION_LABELS = {
  werkstatt: { label: 'Werkstatt', color: 'var(--ink)', bg: 'var(--surface-warm)' },
  shop: { label: 'Shop', color: '#7a4f1a', bg: '#fdf3e7' },
  meta: { label: 'Meta', color: '#2d5a7a', bg: '#e7f3fd' },
  parked: { label: 'Geparkt', color: 'var(--gray-tag)', bg: 'var(--gray-tag-bg)' }
};

export default function ReviewingPage({ session, project, cards: initialCards, setCards, onFinish }) {
  const [analyzed, setAnalyzed] = useState(null); // analysierte Kärtchen
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [clarifyAnswer, setClarifyAnswer] = useState('');
  const [clarifying, setClarifying] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const answerRef = useRef(null);

  useEffect(() => {
    runAnalysis();
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await post('/api/ai/analyze', {
        session_token: session.session_token
      });
      const items = result.analysis.map(a => ({
        ...a,
        // normalize: wenn kein raw_text, aus id rückschließen
        raw_text: a.raw_text || initialCards.find(c => c.id === a.id)?.raw_text || a.raw_text,
        // Override for local cards
      }));

      // Sort: needs_review first, then clean
      const sorted = [
        ...items.filter(i => i.status === 'needs_review'),
        ...items.filter(i => i.status !== 'needs_review')
      ];
      setAnalyzed(sorted);
      // Jump to first needs_review
      setCurrentIndex(0);
    } catch (err) {
      alert('Analyse-Fehler: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClarify = async (item) => {
    if (!clarifyAnswer.trim()) return;
    setClarifying(true);
    try {
      const result = await post('/api/ai/clarify', {
        card_id: item.id,
        raw_text: item.raw_text,
        user_answer: clarifyAnswer,
        current_verb: item.verb,
        current_object: item.object
      });
      const updated = analyzed.map(a =>
        a.id === item.id
          ? { ...a, verb: result.verb, object: result.object, dimension: result.dimension, status: 'clean' }
          : a
      );
      setAnalyzed(updated);
      setClarifyAnswer('');
      // Move to next needs_review
      const nextIdx = updated.findIndex((a, i) => i > currentIndex && a.status === 'needs_review');
      if (nextIdx !== -1) setCurrentIndex(nextIdx);
      else {
        // No more reviews needed — jump to first item
        setCurrentIndex(0);
        setShowAll(true);
      }
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setClarifying(false);
    }
  };

  const updateField = (id, field, value) => {
    setAnalyzed(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleSkip = () => {
    const nextReview = analyzed.findIndex((a, i) => i > currentIndex && a.status === 'needs_review');
    if (nextReview !== -1) setCurrentIndex(nextReview);
    else {
      setShowAll(true);
      setCurrentIndex(0);
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await post('/api/session/save-reviewed', {
        session_token: session.session_token,
        cards: analyzed.map(a => ({
          id: a.id,
          verb: a.verb || '',
          object: a.object || '',
          status: a.status,
          ai_note: a.ai_note || '',
          dimension: a.dimension || 'werkstatt'
        }))
      });
      onFinish();
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', gap: 16
      }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
        <p style={{ color: 'var(--ink-secondary)', fontSize: 14 }}>
          KI analysiert alle Kärtchen …
        </p>
      </div>
    );
  }

  if (!analyzed) return null;

  const reviewItems = analyzed.filter(a => a.status === 'needs_review');
  const cleanItems = analyzed.filter(a => a.status !== 'needs_review');
  const currentItem = analyzed[currentIndex];
  const allReviewed = reviewItems.length === 0;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', color: 'var(--ink-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
          Stufe 2 — Bereinigen
        </p>
        <h2 style={{ fontSize: '1.75rem', marginBottom: 8 }}>KI-gestützte Bereinigung</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-secondary)' }}>
          Die KI hat {analyzed.length} Kärtchen analysiert —
          {reviewItems.length > 0
            ? ` ${reviewItems.length} brauchen Klärung.`
            : ' alle eindeutig zugeordnet.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: reviewItems.length > 0 && !showAll ? '1fr 1fr' : '1fr', gap: 24 }}>

        {/* Review Panel */}
        {reviewItems.length > 0 && !showAll && currentItem && currentItem.status === 'needs_review' && (
          <div>
            <div style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow)'
            }}>
              {/* Progress */}
              <div style={{
                height: 3,
                background: 'var(--border)'
              }}>
                <div style={{
                  height: '100%',
                  background: 'var(--accent)',
                  width: `${((analyzed.filter(a => a.status === 'clean').length) / analyzed.length) * 100}%`,
                  transition: 'width 400ms ease'
                }} />
              </div>

              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Klärung erforderlich
                  </p>
                  <div style={{
                    background: 'var(--surface-warm)',
                    borderRadius: 'var(--radius)',
                    padding: '14px 16px',
                    marginBottom: 16
                  }}>
                    <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', margin: 0 }}>
                      „{currentItem.raw_text}"
                    </p>
                  </div>

                  {/* KI-Frage */}
                  <div style={{
                    display: 'flex',
                    gap: 10,
                    marginBottom: 16,
                    padding: '12px 16px',
                    background: '#f8f6ff',
                    borderRadius: 'var(--radius)',
                    border: '1px solid #e8e3f8'
                  }}>
                    <span style={{ flexShrink: 0, fontSize: 14 }}>🤖</span>
                    <p style={{ fontSize: 14, color: 'var(--ink)', margin: 0, lineHeight: 1.6 }}>
                      {currentItem.ai_note}
                    </p>
                  </div>

                  {/* Bisherige Zuordnung */}
                  {(currentItem.verb || currentItem.object) && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      {currentItem.verb && (
                        <span className="chip chip-verb">Verb: {currentItem.verb}</span>
                      )}
                      {currentItem.object && (
                        <span className="chip chip-object">Objekt: {currentItem.object}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Antwort-Input */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    ref={answerRef}
                    className="input"
                    value={clarifyAnswer}
                    onChange={e => setClarifyAnswer(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleClarify(currentItem);
                    }}
                    placeholder="Ihre Antwort …"
                    disabled={clarifying}
                    autoFocus
                    style={{ fontSize: 14 }}
                  />
                  <button
                    className="btn btn-accent"
                    onClick={() => handleClarify(currentItem)}
                    disabled={!clarifyAnswer.trim() || clarifying}
                    style={{ flexShrink: 0 }}
                  >
                    {clarifying ? <span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> : '✓'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleSkip}
                    style={{ fontSize: 13 }}
                  >
                    Überspringen
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => updateField(currentItem.id, 'dimension', 'parked')}
                    style={{ fontSize: 13, color: 'var(--ink-muted)' }}
                    title="Als Shop/Meta parken"
                  >
                    Parken
                  </button>
                </div>
              </div>

              {/* Navigation */}
              {reviewItems.length > 1 && (
                <div style={{
                  borderTop: '1px solid var(--border)',
                  padding: '12px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    Noch {reviewItems.length} zur Klärung
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {reviewItems.slice(0, 8).map((item, i) => (
                      <div key={i} style={{
                        width: 8, height: 8,
                        borderRadius: '50%',
                        background: item.id === currentItem.id
                          ? 'var(--accent)'
                          : 'var(--border)'
                      }} />
                    ))}
                    {reviewItems.length > 8 && (
                      <span style={{ fontSize: 10, color: 'var(--ink-muted)' }}>+{reviewItems.length - 8}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card List */}
        <div style={{ gridColumn: (reviewItems.length === 0 || showAll) ? '1 / -1' : undefined }}>

          {/* All-reviewed banner */}
          {allReviewed && (
            <div className="fade-in" style={{
              background: 'var(--green-light)',
              border: '1px solid #a8d5bc',
              borderRadius: 'var(--radius)',
              padding: '14px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <p style={{ fontSize: 14, color: 'var(--green)', margin: 0, fontWeight: 500 }}>
                Alle Kärtchen bereinigt — bitte prüfen und abschließen.
              </p>
            </div>
          )}

          {/* Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
              {analyzed.length} Kärtchen · {cleanItems.length} bereinigt · {reviewItems.length} offen
            </span>
            {!allReviewed && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAll(!showAll)}
                style={{ fontSize: 13 }}
              >
                {showAll ? 'Zur Klärung' : 'Alle anzeigen'}
              </button>
            )}
          </div>

          {/* Cards table */}
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 80px',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface-warm)'
            }}>
              {['Kärtchen', 'Verb', 'Objekt', 'Dimension', 'Status'].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div>
              {analyzed.map((item, i) => (
                <CardRow
                  key={item.id}
                  item={item}
                  isActive={item.id === currentItem?.id && !showAll}
                  onFieldChange={(field, val) => updateField(item.id, field, val)}
                  onJumpTo={() => { setCurrentIndex(i); setShowAll(false); }}
                  isLast={i === analyzed.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Finish */}
          <div style={{
            marginTop: 24,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            alignItems: 'center'
          }}>
            {reviewItems.length > 0 && (
              <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                {reviewItems.length} Kärtchen noch offen — trotzdem abschließen?
              </p>
            )}
            <button
              className="btn btn-primary btn-lg"
              onClick={handleFinish}
              disabled={finishing}
            >
              {finishing
                ? <><span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Wird gespeichert …</>
                : 'Bereinigung abschließen →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardRow({ item, isActive, onFieldChange, onJumpTo, isLast }) {
  const dim = DIMENSION_LABELS[item.dimension] || DIMENSION_LABELS.werkstatt;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr 80px',
      padding: '10px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      alignItems: 'center',
      gap: 8,
      background: isActive ? 'var(--accent-light)' : item.status === 'needs_review' ? 'var(--orange-light)' : 'transparent',
      transition: 'background 200ms ease'
    }}>
      {/* Raw text */}
      <div>
        <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: item.status === 'needs_review' ? 500 : 400 }}>
          {item.raw_text}
        </span>
        {item.status === 'needs_review' && (
          <div>
            <button
              onClick={onJumpTo}
              style={{
                fontSize: 11, color: 'var(--orange)', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0, marginTop: 2
              }}
            >
              → Klären
            </button>
          </div>
        )}
      </div>

      {/* Verb */}
      <EditableField
        value={item.verb}
        placeholder="—"
        chip="chip-verb"
        onChange={v => onFieldChange('verb', v)}
      />

      {/* Objekt */}
      <EditableField
        value={item.object}
        placeholder="—"
        chip="chip-object"
        onChange={v => onFieldChange('object', v)}
      />

      {/* Dimension */}
      <select
        value={item.dimension || 'werkstatt'}
        onChange={e => onFieldChange('dimension', e.target.value)}
        style={{
          padding: '4px 8px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: dim.bg,
          color: dim.color,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'DM Sans, sans-serif'
        }}
      >
        <option value="werkstatt">Werkstatt</option>
        <option value="shop">Shop</option>
        <option value="meta">Meta</option>
        <option value="parked">Geparkt</option>
      </select>

      {/* Status */}
      <div>
        <span className={`badge badge-${item.status === 'clean' ? 'clean' : item.status === 'needs_review' ? 'review' : 'pending'}`}>
          {item.status === 'clean' ? '✓' : item.status === 'needs_review' ? '?' : '–'}
        </span>
      </div>
    </div>
  );
}

function EditableField({ value, placeholder, chip, onChange }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value || '');

  useEffect(() => { setLocal(value || ''); }, [value]);

  if (editing) {
    return (
      <input
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { onChange(local); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { onChange(local); setEditing(false); } }}
        autoFocus
        style={{
          width: '100%', padding: '3px 8px',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13, background: 'white',
          fontFamily: 'DM Sans, sans-serif'
        }}
      />
    );
  }

  return (
    <span
      className={value ? chip : ''}
      onClick={() => setEditing(true)}
      style={{
        cursor: 'pointer',
        display: 'inline-block',
        padding: value ? undefined : '2px 8px',
        color: value ? undefined : 'var(--ink-muted)',
        fontSize: 12
      }}
      title="Klicken zum Bearbeiten"
    >
      {value || placeholder}
    </span>
  );
}
