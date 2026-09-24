export interface OgCardProps {
  readonly eyebrow: string;
  readonly title: string;
}

/**
 * Render minimal light glass social card.
 *
 * @param props - Short English copy rendered verbatim with inline styles only.
 * @returns JSX consumed by `ImageResponse`; no I/O, no fonts, no images.
 */
export function OgCard({ eyebrow, title }: OgCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #f6f3ea 0%, #ece3cf 55%, #e0d3b8 100%)',
        fontFamily: 'sans-serif',
        padding: '64px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '520px',
          height: '520px',
          left: '-140px',
          top: '-160px',
          borderRadius: '999px',
          backgroundColor: 'rgba(204, 154, 68, 0.38)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '260px',
          height: '260px',
          right: '120px',
          top: '-80px',
          borderRadius: '999px',
          backgroundColor: 'rgba(228, 185, 106, 0.45)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '620px',
          height: '620px',
          right: '-180px',
          bottom: '-220px',
          borderRadius: '999px',
          backgroundColor: 'rgba(26, 36, 48, 0.12)',
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.66)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          borderRadius: '28px',
          boxShadow: '0 32px 80px rgba(26, 36, 48, 0.18)',
          padding: '48px 64px',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '0px',
            left: '0px',
            right: '0px',
            height: '120px',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0))',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            border: '1.5px solid #b88d3a',
            borderRadius: '999px',
            color: '#8a5f1c',
            fontSize: '19px',
            fontWeight: 700,
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            padding: '10px 26px 10px 30px',
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            position: 'relative',
            marginTop: '28px',
            color: '#1a2430',
            fontSize: '74px',
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            position: 'relative',
            marginTop: '30px',
            width: '72px',
            height: '4px',
            backgroundColor: '#b88d3a',
            borderRadius: '999px',
          }}
        />
      </div>
    </div>
  );
}
