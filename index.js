// simple-proxy.js
const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  const targetUrl = parsedUrl.query.url;

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Missing URL parameter',
      usage: '?url=https://example.com'
    }));
    return;
  }

  try {
    const target = new URL(targetUrl);
    const options = {
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: target.hostname
      }
    };

    // Remove problematic headers
    delete options.headers['host'];
    delete options.headers['connection'];
    delete options.headers['accept-encoding'];

    const proxyReq = (target.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
      // Forward status code
      res.writeHead(proxyRes.statusCode, proxyRes.headers);

      // Pipe the response
      proxyRes.pipe(res, {
        end: true
      });
    });

    // Handle errors
    proxyReq.on('error', (error) => {
      console.error('Proxy error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Proxy request failed',
        message: error.message
      }));
    });

    // Pipe request body if present
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
  console.log(`🚀 Simple CORS Proxy running on http://localhost:${PORT}`);
  console.log(`📝 Usage: http://localhost:${PORT}/?url=https://api.example.com/data`);
});