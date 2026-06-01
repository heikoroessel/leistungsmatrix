const DIMENSION_LABELS = {
  werkstatt: { label: 'Werkstatt', bg: 'var(--surface-warm)', color: 'var(--ink)' },
  shop: { label: 'Shop', bg: '#fdf3e7', color: '#7a4f1a' },
  meta: { label: 'Meta', bg: '#e7f3fd', color: '#2d5a7a' },
  parked: { label: 'Geparkt', bg: 'var(--gray-tag-bg)', color: 'var(--gray-tag)' }
};

export default function DonePage({ session, project, cards }) {
  const werkstatt = cards.filter(c => c.dimension === 'werkstatt');
  const shop = cards.filter(c => c.dimension === 'shop');
  const meta = cards.filter(c => c.dimension === 'meta');
  const parked = cards.filter(c => c.dimension === 'parked' || !c.dimension);

  const verbs = [...new Set(werkstatt.map(c => c.verb).filter(Boolean))].sort();
  const objects = [...new Set(werkstatt.map(c => c.object).filter(Boolean))].sort();

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

      {/* Done banner */}
      <div className="fade-in" style={{
        background: 'var(--green-light)',
        border: '1px solid #a8d5bc',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        marginBottom: 36,
        display: 'flex',
        gap: 20,
        alignItems: 'flex-start'
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, color: '#fff', fontSize: 20
        }}>✓</div>
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--green)', marginBottom: 6 }}>
            Erfassung abgeschlossen
          </h2>
          <p style={{ fontSize: 14, color: 'var(--green)', opacity: 0.85, margin: 0 }}>
            Alle Kärtchen wurden bereinigt und gespeichert. Der Berater erhält
            Ihre Ergebnisse im Analyse-Dashboard.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 32
      }}>
        {[
          { label: 'Werkstatt', count: werkstatt.length, ...DIMENSION_LABELS.werkstatt },
          { label: 'Shop', count: shop.length, ...DIMENSION_LABELS.shop },
          { label: 'Meta', count: meta.length, ...DIMENSION_LABELS.meta },
          { label: 'Geparkt', count: parked.length, ...DIMENSION_LABELS.parked }
        ].map(d => (
          <div key={d.label} className="card" style={{ padding: '16px', background: d.bg }}>
            <div style={{ fontSize: 22, fontFamily: 'DM Serif Display', color: d.color, marginBottom: 2 }}>
              {d.count}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: d.color, opacity: 0.8 }}>
              {d.label}
            </div>
          </div>
        ))}
      </div>

      {/* Werkstatt preview */}
      {verbs.length > 0 && objects.length > 0 && (
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>Vorschau: Ihre Werkstatt-Tätigkeiten</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-muted)', alignSelf: 'center', marginRight: 4 }}>Verben:</span>
            {verbs.map(v => <span key={v} className="chip chip-verb">{v}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-muted)', alignSelf: 'center', marginRight: 4 }}>Objekte:</span>
            {objects.map(o => <span key={o} className="chip chip-object">{o}</span>)}
          </div>
        </div>
      )}

      <p style={{ fontSize: 14, color: 'var(--ink-muted)', textAlign: 'center' }}>
        Diese Seite können Sie schließen. Vielen Dank für Ihre Teilnahme.
      </p>
    </div>
  );
}
