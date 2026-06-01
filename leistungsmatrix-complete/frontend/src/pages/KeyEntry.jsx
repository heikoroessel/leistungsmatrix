import { useState } from 'react';
import { post } from '../api.js';

const TN_KEY_STORAGE = 'lm_tn_key';

export default function KeyEntry({ onSessionStart }) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = key.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError('');

    try {
      const data = await post('/api/session/start', { tn_key: trimmed });
      localStorage.setItem(TN_KEY_STORAGE, trimmed);
      onSessionStart(data.session, data.project, data.cards || []);
    } catch (err) {
      setError(err.message || 'Ungültiger Key. Bitte überprüfen.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface)',
      padding: 24
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440
      }}>
        {/* Wordmark */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" fill="var(--ink)" opacity="0.15"/>
              <rect x="18" y="2" width="12" height="12" rx="2" fill="var(--ink)" opacity="0.4"/>
              <rect x="2" y="18" width="12" height="12" rx="2" fill="var(--ink)" opacity="0.6"/>
              <rect x="18" y="18" width="12" height="12" rx="2" fill="var(--ink)"/>
            </svg>
            <h1 style={{ fontSize: '1.6rem', letterSpacing: '-0.02em' }}>Leistungsmatrix</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
            nach Rössel (2011)
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '40px 36px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 8 }}>Teilnehmer-Zugang</h2>
          <p style={{ fontSize: 14, marginBottom: 28, color: 'var(--ink-secondary)' }}>
            Geben Sie Ihren Teilnehmer-Key ein.<br/>
            Sie erhalten ihn vom Berater oder Projektleiter.
          </p>

          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
            Teilnehmer-Key
          </label>
          <input
            className="input"
            type="text"
            placeholder="TN-XXXXXX"
            value={key}
            onChange={e => setKey(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            style={{
              letterSpacing: '0.08em',
              fontWeight: 500,
              fontSize: 16,
              marginBottom: error ? 8 : 20
            }}
          />

          {error && (
            <p style={{
              fontSize: 13,
              color: '#c0392b',
              marginBottom: 16,
              padding: '8px 12px',
              background: '#fdf2f2',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #f5c6c6'
            }}>
              {error}
            </p>
          )}

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleSubmit}
            disabled={loading || !key.trim()}
          >
            {loading ? <><span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Laden …</> : 'Starten'}
          </button>
        </div>

        {/* Hint */}
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--ink-muted)' }}>
          Sie sind Berater?{' '}
          <a href="/admin" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            Admin-Bereich
          </a>
        </p>
      </div>
    </div>
  );
}
