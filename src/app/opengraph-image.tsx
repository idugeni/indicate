import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default control-plane social card (1200x630, Node.js runtime). Fully static: no tenant data, no request I/O. */
export default function DefaultOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          backgroundColor: '#0e1320',
          color: '#edeadd',
          fontFamily: 'sans-serif',
          padding: '64px 72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: '#cc9a44',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px',
              fontWeight: 800,
              color: '#0e1320',
            }}
          >
            I
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>Indicate</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '60px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
            Publishing infrastructure.
          </div>
          <div style={{ fontSize: '26px', color: '#9fa6b8' }}>
            Centralized dashboard · Multi-site publishing · indicate.web.id
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '20px',
            color: '#e4b96a',
          }}
        >
          <div style={{ width: '48px', height: '2px', backgroundColor: '#cc9a44' }} />
          Regional Media Publishing Network
        </div>
      </div>
    ),
    { ...size },
  );
}
