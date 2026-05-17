const ENV_PROXY_BASE_URL = process.env.NEXT_PUBLIC_PROXY_BASE_URL || '';

function getProxyBaseUrl(): string {
  if (typeof window === 'undefined') {
    return ENV_PROXY_BASE_URL || '/api/browser';
  }

  const pointsToLocalProxy = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(
    ENV_PROXY_BASE_URL
  );

  if (pointsToLocalProxy) {
    return `${window.location.origin}/api/browser`;
  }

  return ENV_PROXY_BASE_URL || `${window.location.origin}/api/browser`;
}

export async function fetchProxiedContent(url: string): Promise<string> {
  const res = await fetch(`${getProxyBaseUrl()}/content?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Proxy content fetch failed: ${res.status}`);
  const data = await res.json();
  return data.content || '';
}

export function getProxyUrl(url: string): string {
  return `${getProxyBaseUrl()}/proxy?url=${encodeURIComponent(url)}`;
}
