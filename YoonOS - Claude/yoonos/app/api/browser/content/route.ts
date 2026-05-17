import { NextRequest, NextResponse } from 'next/server';

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

function toPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

export async function GET(request: NextRequest) {
  const targetParam = request.nextUrl.searchParams.get('url');
  if (!targetParam) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const targetUrl = normalizeUrl(targetParam);

  try {
    const upstream = await fetch(targetUrl, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      cache: 'no-store',
    });
    const html = await upstream.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || '';
    const content = toPlainText(html);

    return NextResponse.json({ url: targetUrl, title, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({
      url: targetUrl,
      title: 'Error',
      content: `Could not fetch page: ${message}`,
    });
  }
}
