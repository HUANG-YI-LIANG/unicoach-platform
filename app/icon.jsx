import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F172A',
          borderRadius: '112px',
        }}
      >
        <div style={{ display: 'flex', position: 'relative', width: 220, height: 220 }}>
          {/* U Shape built with borders */}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 20,
              width: 180,
              height: 120,
              borderBottom: '45px solid white',
              borderLeft: '45px solid white',
              borderRight: '45px solid white',
              borderBottomLeftRadius: '90px',
              borderBottomRightRadius: '90px',
            }}
          />
          {/* Left pillar extension */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              width: 45,
              height: 80,
              backgroundColor: 'white',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
            }}
          />
          {/* Right orange bar */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 0,
              width: 90,
              height: 45,
              backgroundColor: '#EA580C',
              borderRadius: '12px',
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
