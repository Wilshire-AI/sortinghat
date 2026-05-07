import { ImageResponse } from 'next/og';

export const alt = 'Sorting Hat. The New York that fits you.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

// Fetch the Newsreader Italic font from Google Fonts so the title renders
// in the brand serif rather than Satori's default sans-serif. The fetch
// happens at build time (force-static) so production never needs runtime
// network access for fonts.
async function loadNewsreaderItalic(): Promise<ArrayBuffer> {
  const cssRes = await fetch(
    'https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@1,500&display=swap',
    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SortinghatOG/1.0)' } },
  );
  const css = await cssRes.text();
  const url = css.match(/src:\s*url\((https:[^)]+)\)/)?.[1];
  if (!url) throw new Error('Could not extract font URL from Google Fonts CSS');
  const fontRes = await fetch(url);
  return await fontRes.arrayBuffer();
}

export default async function OpenGraphImage() {
  const fontData = await loadNewsreaderItalic();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#f4ede2',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 80px',
        }}
      >
        <svg
          width="240"
          height="240"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          style={{ marginBottom: 28 }}
        >
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
        <div
          style={{
            fontFamily: 'Newsreader',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 124,
            color: '#2b1f17',
            lineHeight: 1.05,
            letterSpacing: -1,
            display: 'flex',
          }}
        >
          Sorting Hat
        </div>
        <div
          style={{
            width: 88,
            height: 3,
            background: '#b14b2c',
            marginTop: 24,
            marginBottom: 24,
          }}
        />
        <div
          style={{
            fontSize: 38,
            color: '#7d6b54',
            letterSpacing: 0.4,
            display: 'flex',
          }}
        >
          The New York that fits you.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Newsreader',
          data: fontData,
          style: 'italic',
          weight: 500,
        },
      ],
    },
  );
}
