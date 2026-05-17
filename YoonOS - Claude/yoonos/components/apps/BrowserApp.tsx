'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Loader2 } from 'lucide-react';
import { useBrowserStore } from '@/stores/browserStore';

const ENV_PROXY_BASE_URL = process.env.NEXT_PUBLIC_PROXY_BASE_URL || '';

function getRuntimeProxyBaseUrl(): string {
  if (typeof window === 'undefined') {
    return ENV_PROXY_BASE_URL || '/api/browser';
  }

  const pointsToLocalProxy = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(
    ENV_PROXY_BASE_URL
  );

  // Localhost proxy services are often not running; always prefer internal API in that case.
  if (pointsToLocalProxy) {
    return `${window.location.origin}/api/browser`;
  }

  return ENV_PROXY_BASE_URL || `${window.location.origin}/api/browser`;
}

export default function BrowserApp() {
  const { currentUrl, navigate, goBack, goForward, historyIndex, history, isLoading, setLoading } =
    useBrowserStore();
  const [inputUrl, setInputUrl] = useState(currentUrl ?? '');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInputUrl(currentUrl ?? '');
  }, [currentUrl]);

  useEffect(() => {
    if (isLoading) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setLoading(false);
      }, 5000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isLoading, setLoading]);

  const handleNavigate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const cleaned = (inputUrl ?? '').replace(/^undefined/, '').trim();
      if (cleaned) {
        navigate(cleaned);
      }
    },
    [inputUrl, navigate]
  );

  const proxyBaseUrl = getRuntimeProxyBaseUrl();
  const proxyUrl = currentUrl
    ? `${proxyBaseUrl}/proxy?url=${encodeURIComponent(currentUrl)}`
    : '';

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-1 p-1.5 bg-white border-b border-black/10">
        <button
          onClick={goBack}
          disabled={historyIndex <= 0}
          className="p-1 rounded hover:bg-black/5 disabled:opacity-30 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-black/70" />
        </button>
        <button
          onClick={goForward}
          disabled={historyIndex >= history.length - 1}
          className="p-1 rounded hover:bg-black/5 disabled:opacity-30 transition-colors"
        >
          <ArrowRight className="w-3.5 h-3.5 text-black/70" />
        </button>
        <button
          onClick={() => currentUrl && navigate(currentUrl)}
          className="p-1 rounded hover:bg-black/5 transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5 text-black/70" />
        </button>

        <form onSubmit={handleNavigate} className="flex-1">
          <input
            type="text"
            value={inputUrl ?? ''}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Enter URL..."
            className="w-full bg-neutral-50 border border-black/10 text-black/90 text-xs rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-black placeholder:text-black/30"
          />
        </form>
      </div>

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
            <Loader2 className="w-5 h-5 text-black animate-spin" />
          </div>
        )}
        {proxyUrl ? (
          <iframe
            ref={iframeRef}
            src={proxyUrl}
            className="w-full h-full border-0 bg-white"
            onLoad={() => setLoading(false)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-white text-black/40">
            <GlobeIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Enter a URL to browse</p>
            <p className="text-xs text-black/25 mt-1">Try: news.ycombinator.com or en.wikipedia.org</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
