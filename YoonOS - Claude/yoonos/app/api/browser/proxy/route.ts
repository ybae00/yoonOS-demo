import { NextRequest } from 'next/server';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
  'Cache-Control': 'no-cache',
};

function normalizeUrl(input: string): string {
  return input.startsWith('http') ? input : `https://${input}`;
}

function patchHtml(html: string, targetUrl: string): string {
  const base = new URL(targetUrl);
  const baseTag = `<base href="${base.origin}/">`;
  const headPattern = /<head[^>]*>/i;

  let patched = html
    .replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
    .replace(/X-Frame-Options/gi, '');

  if (headPattern.test(patched)) {
    patched = patched.replace(headPattern, (m) => `${m}${baseTag}`);
  } else {
    patched = `${baseTag}${patched}`;
  }

  return patched;
}

export async function GET(request: NextRequest) {
  const targetParam = request.nextUrl.searchParams.get('url');
  if (!targetParam) {
    return new Response('Missing url parameter', { status: 400 });
  }

  const targetUrl = normalizeUrl(targetParam);

  try {
    const upstream = await fetch(targetUrl, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      cache: 'no-store',
    });

    const contentType = upstream.headers.get('content-type') || '';
    const body = await upstream.text();

    if (!contentType.includes('text/html')) {
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': contentType || 'text/plain; charset=utf-8',
          'X-Frame-Options': '',
          'Content-Security-Policy': '',
        },
      });
    }

    return new Response(patchHtml(body, targetUrl), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': '',
        'Content-Security-Policy': '',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      `<html><body style="font-family:-apple-system,sans-serif;padding:40px;color:#888;background:#1e1e1e;">
        <h2 style="color:#ccc;">Could not load page</h2>
        <p>This site returned an error or blocks proxy access.</p>
        <p style="color:#666;font-size:13px;">URL: ${targetUrl}</p>
        <p style="color:#555;font-size:12px;margin-top:20px;">${message}</p>
      </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
