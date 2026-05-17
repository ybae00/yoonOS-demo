const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url parameter');

  try {
    const response = await axios.get(targetUrl, {
      headers: BROWSER_HEADERS,
      timeout: 15000,
      responseType: 'text',
      maxRedirects: 5,
      validateStatus: (status) => status < 400,
    });

    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', '');
    res.setHeader('X-Frame-Options', '');

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      res.setHeader('Content-Type', contentType);
      res.send(response.data);
      return;
    }

    const $ = cheerio.load(response.data);
    const base = new URL(targetUrl);

    $('meta[http-equiv="Content-Security-Policy"]').remove();

    if ($('base').length === 0) {
      $('head').prepend(`<base href="${base.origin}/">`);
    }

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('/')) {
        $(el).attr('href', `/proxy?url=${encodeURIComponent(base.origin + href)}`);
      }
    });

    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('/')) {
        $(el).attr('src', `${base.origin}${src}`);
      } else if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('//')) {
        $(el).attr('src', `${base.origin}/${src}`);
      }
    });

    $('link[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('/')) {
        $(el).attr('href', `${base.origin}${href}`);
      }
    });

    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('/')) {
        $(el).attr('src', `${base.origin}${src}`);
      }
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send($.html());
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(200).send(`<html><body style="font-family:-apple-system,sans-serif;padding:40px;color:#888;background:#1e1e1e;">
      <h2 style="color:#ccc;">Could not load page</h2>
      <p>This site returned an error (${status}) or blocks proxy access.</p>
      <p style="color:#666;font-size:13px;">URL: ${targetUrl}</p>
      <p style="color:#555;font-size:12px;margin-top:20px;">Try a different site. Sites like Wikipedia, Hacker News, and most blogs work well.</p>
    </body></html>`);
  }
});

app.get('/content', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    const response = await axios.get(targetUrl, {
      headers: BROWSER_HEADERS,
      timeout: 15000,
      responseType: 'text',
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);
    $('script, style, nav, footer, header, aside, [role="navigation"], [role="banner"], iframe, noscript').remove();

    const title = $('title').text().trim();
    const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);

    res.json({ url: targetUrl, title, content: text });
  } catch (err) {
    res.status(200).json({ url: targetUrl, title: 'Error', content: `Could not fetch page: ${err.message}` });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`YoonOS Proxy running on port ${PORT}`));
