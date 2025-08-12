// Filename: /api/proxy.js
// This is the corrected Vercel Serverless Function for the web proxy.

export default async function handler(request, response) {
    const targetUrl = request.query.url;

    if (!targetUrl) {
        return response.status(400).send('Error: URL parameter is missing.');
    }

    try {
        const externalResponse = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            },
            redirect: 'follow'
        });

        if (!externalResponse.ok) {
            return response.status(externalResponse.status).send(`Error fetching the URL: ${externalResponse.statusText}`);
        }

        // Forward the original headers from the target response to our client.
        // This is important for content type, caching, etc.
        externalResponse.headers.forEach((value, name) => {
            // Some headers like 'content-encoding' are handled automatically by Vercel's infrastructure.
            // Avoid setting them directly to prevent errors.
            if (name.toLowerCase() !== 'content-encoding' && name.toLowerCase() !== 'transfer-encoding') {
                response.setHeader(name, value);
            }
        });

        // --- THE FIX IS HERE ---
        // The body from fetch() is a Web Stream (ReadableStream). It does not have a .pipe() method.
        // We must manually read from it and write to the Vercel response object, which is a Node.js stream.
        // The `for await...of` loop is the modern, efficient way to handle this.
        if (externalResponse.body) {
            for await (const chunk of externalResponse.body) {
                response.write(chunk);
            }
        }
        
        response.end(); // End the response stream once all chunks are written.

    } catch (error) {
        console.error('Proxy Error:', error);
        // Provide a more informative error message to the client
        return response.status(500).send(`Server error while trying to proxy the request: ${error.message}`);
    }
}