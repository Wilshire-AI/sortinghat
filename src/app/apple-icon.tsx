import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#f4ede2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="156" height="156" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 28 72 C 28 58 28 44 34 32 C 38 24 44 16 52 12 C 60 10 70 14 72 24 C 72 30 64 32 58 32 C 60 34 64 34 64 34 C 64 44 70 58 72 72 Z"
            fill="#2b1f17"
          />
          <path
            d="M 4 72 Q 50 66 96 72 Q 100 82 92 87 Q 50 92 8 87 Q 0 82 4 72 Z"
            fill="#2b1f17"
          />
          <rect x="32" y="52" width="38" height="3" fill="#b14b2c" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
