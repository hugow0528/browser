// Vercel Edge functions are fast and have a generous free tier.
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 1. Get the target URL from the query string
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new Response('Please provide a "url" query parameter.', { status: 400 });
  }

  try {
    // 2. Fetch the content from the target URL
    const response = await fetch(targetUrl, {
      // Forward some headers from the original request
      headers: {
        'User-Agent': req.headers.get('User-Agent') || 'VercelProxy/1.0',
        'Accept': req.headers.get('Accept') || '*/*',
        'Accept-Language': req.headers.get('Accept-Language') || 'en-US,en;q=0.9',
      },
      // IMPORTANT: Redirects must be handled manually to rewrite URLs
      redirect: 'manual',
    });

    // 3. Handle redirects manually
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        // Create the new redirected proxy URL and send it back to the client
        const redirectedProxyUrl = `/api/browse?url=${encodeURIComponent(location)}`;
        return new Response(null, {
          status: 302, // Found
          headers: {
            'Location': redirectedProxyUrl,
          },
        });
      }
    }

    const contentType = response.headers.get('content-type') || '';

    // 4. If the content is HTML, we need to rewrite URLs
    if (contentType.includes('text/html')) {
      let body = await response.text();

      // Get the base URL to resolve relative paths
      const base = new URL(targetUrl);

      // Function to rewrite a single URL
      const rewriteUrl = (match, attribute, url) => {
        if (url.startsWith('//')) {
          url = base.protocol + url;
        } else if (url.startsWith('/')) {
          url = base.origin + url;
        } else if (!url.startsWith('http')) {
          url = new URL(url, base.href).href;
        }
        return `${attribute}="/api/browse?url=${encodeURIComponent(url)}"`;
      };

      // Rewrite common attributes
      body = body.replace(/(href|src|action)=["']([^"']+)["']/g, rewriteUrl);
      
      // Remove integrity checks, as we are modifying the content
      body = body.replace(/integrity="[^"]+"/g, '');

      // Create new headers, keeping original content-type but removing security headers
      const headers = new Headers(response.headers);
      headers.delete('Content-Security-Policy');
      headers.delete('Content-Length');
      headers.delete('X-Frame-Options');

      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
      });
    }

    // 5. For all other content types (CSS, JS, images), stream them directly
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

  } catch (error) {
    console.error('Proxy Error:', error);
    return new Response(`An error occurred while proxying the request: ${error.message}`, { status: 500 });
  }
}
