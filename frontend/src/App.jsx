import { useState, useEffect } from 'react';
import KeyEntry from './pages/KeyEntry.jsx';
import CollectingPage from './pages/CollectingPage.jsx';
import ReviewingPage from './pages/ReviewingPage.jsx';
import DonePage from './pages/DonePage.jsx';

const SESSION_KEY = 'lm_session_token';
const TN_KEY_STORAGE = 'lm_tn_key';

export default function App() {
  const [session, setSession] = useState(null);       // { id, phase, participant_label }
  const [project, setProject] = useState(null);       // { id, name }
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Beim Start: gespeicherte Session wiederherstellen
  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY);
    const tnKey = localStorage.getItem(TN_KEY_STORAGE);
    if (token && tnKey) {
      import('./api.js').then(({ post }) => {
        post('/api/session/start', { tn_key: tnKey, session_token: token })
          .then(data => {
            setSession(data.session);
            setProject(data.project);
            setCards(data.cards || []);
          })
          .catch(() => {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(TN_KEY_STORAGE);
          })
          .finally(() => setLoading(false));
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleSessionStart = (sessionData, projectData, existingCards = []) => {
    localStorage.setItem(SESSION_KEY, sessionData.session_token);
    setSession(sessionData);
    setProject(projectData);
    setCards(existingCards);
  };

  const handlePhaseChange = (newPhase, updatedCards = null) => {
    setSession(prev => ({ ...prev, phase: newPhase }));
    if (updatedCards) setCards(updatedCards);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TN_KEY_STORAGE);
    setSession(null);
    setProject(null);
    setCards([]);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--surface)'
      }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return <KeyEntry onSessionStart={handleSessionStart} />;
  }

  const phase = session.phase;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-card)',
        padding: '0 32px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'DM Serif Display', fontSize: '1.1rem' }}>Leistungsmatrix</span>
          {project && (
            <>
              <span style={{ color: 'var(--border-strong)', fontSize: 13 }}>·</span>
              <span style={{ color: 'var(--ink-secondary)', fontSize: 14 }}>{project.name}</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <PhaseStepper phase={phase} />
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ fontSize: 13 }}>
            Beenden
          </button>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {phase === 'collecting' && (
          <CollectingPage
            session={session}
            project={project}
            cards={cards}
            setCards={setCards}
            onFinish={(updatedCards) => handlePhaseChange('reviewing', updatedCards)}
          />
        )}
        {phase === 'reviewing' && (
          <ReviewingPage
            session={session}
            project={project}
            cards={cards}
            setCards={setCards}
            onFinish={() => handlePhaseChange('done')}
          />
        )}
        {phase === 'done' && (
          <DonePage session={session} project={project} cards={cards} />
        )}
      </main>
    </div>
  );
}

function PhaseStepper({ phase }) {
  const steps = [
    { key: 'collecting', label: 'Erfassen' },
    { key: 'reviewing', label: 'Bereinigen' },
    { key: 'done', label: 'Abgeschlossen' }
  ];
  const idx = steps.findIndex(s => s.key === phase);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((step, i) => {
        const active = step.key === phase;
        const done = i < idx;
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <div style={{
                width: 24, height: 1,
                background: done || active ? 'var(--ink)' : 'var(--border)',
                margin: '0 2px'
              }} />
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              background: active ? 'var(--ink)' : 'transparent'
            }}>
              <div style={{
                width: 18, height: 18,
                borderRadius: '50%',
                background: done ? 'var(--green)' : active ? '#fff' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10,
                color: done ? '#fff' : active ? 'var(--ink)' : 'var(--ink-muted)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: 12,
                fontWeight: active ? 500 : 400,
                color: active ? '#fff' : done ? 'var(--ink-secondary)' : 'var(--ink-muted)'
              }}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
