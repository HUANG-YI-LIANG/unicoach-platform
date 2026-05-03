import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
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
          borderRadius: '40px',
        }}
      >
        <div style={{ display: 'flex', position: 'relative', width: 80, height: 80 }}>
          <div
            style={{
              position: 'absolute',
              bottom: 4,
              left: 7,
              width: 66,
              height: 45,
              borderBottom: '16px solid white',
              borderLeft: '16px solid white',
              borderRight: '16px solid white',
              borderBottomLeftRadius: '33px',
              borderBottomRightRadius: '33px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 7,
              left: 7,
              width: 16,
              height: 30,
              backgroundColor: 'white',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 7,
              right: 0,
              width: 32,
              height: 16,
              backgroundColor: '#EA580C',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
