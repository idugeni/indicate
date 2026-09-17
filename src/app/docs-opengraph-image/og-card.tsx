export function DocsOgCard() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'sans-serif',
        padding: '64px 72px',
        border: '24px solid #1a5fd0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            backgroundColor: '#1a5fd0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            fontWeight: 800,
            color: '#ffffff',
          }}
        >
          i
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>Indicate Docs</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '60px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
          API · Webhook · Telegram Reference.
        </div>
        <div style={{ fontSize: '26px', color: '#475569' }}>docs.indicate.web.id — kontrak integrasi resmi</div>
      </div>
    </div>
  );
}
