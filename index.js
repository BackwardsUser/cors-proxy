// simple-proxy.js
const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Set CORS headers - important for your use case
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL and get the target
  const parsedUrl = url.parse(req.url, true);
  let targetUrl = parsedUrl.query.url;

  // Clean up the URL - remove any quotes that might be present
  if (targetUrl) {
    targetUrl = targetUrl.replace(/^["']|["']$/g, '');
  }

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Missing URL parameter',
      usage: '?url=https://example.com'
    }));
    return;
  }

  console.log(`Proxying request to: ${targetUrl}`);

  try {
    const target = new URL(targetUrl);

    // Validate protocol
    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new Error('Only HTTP/HTTPS URLs are allowed');
    }

    const options = {
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: target.hostname,
        'User-Agent': 'CORS-Proxy/1.0'
      }
    };

    // Remove problematic headers
    delete options.headers['host'];
    delete options.headers['connection'];
    delete options.headers['accept-encoding'];

    const proxyReq = (target.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
      // Forward status and headers
      res.writeHead(proxyRes.statusCode, proxyRes.headers);

      // Pipe the response
      proxyRes.pipe(res, {
        end: true
      });
    });

    proxyReq.on('error', (error) => {
      console.error('Proxy error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Proxy request failed',
        message: error.message
      }));
    });

    // Send request body if present
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      req.pipe(proxyReq, {
        end: true
      });
    } else {
      proxyReq.end();
    }

  } catch (error) {
    console.error('Invalid URL:', error);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Invalid URL',
      message: error.message
    }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 CORS Proxy running on http://localhost:${PORT}`);
  console.log(`📝 Example: http://localhost:${PORT}/?url=https://dnd5e.wikidot.com/spell%3Amage-hand`);
  console.log(`🌐 For your URL: http://localhost:${PORT}/?url=https://dnd5e.wikidot.com/spell%3Amage-hand`);
});