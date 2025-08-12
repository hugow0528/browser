// Filename: /api/proxy.js
// This is a Vercel Serverless Function that acts as a web proxy.

export default async function handler(request, response) {
    // Get the URL from the query parameter
    const targetUrl = request.query.url;

    if (!targetUrl) {
        return response.status(400).send('Error: URL parameter is missing.');
    }

    try {
        // Use Fetch API to get the content from the target URL
        // `undici` is the modern, standards-compliant fetch library used by Node.js
        const externalResponse = await fetch(targetUrl, {
            headers: {
                // Pass some basic headers to look like a regular browser
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            },
            // Important for handling sites with redirects
            redirect: 'follow'
        });

        // Check if the external request was successful
        if (!externalResponse.ok) {
            // Forward the error status from the target server
            return response.status(externalResponse.status).send(`Error fetching the URL: ${externalResponse.statusText}`);
        }

        // Get the content type from the original response
        const contentType = externalResponse.headers.get('content-type');
        
        // **This is the key part for streaming**
        // We get the response body as a ReadableStream
        const bodyStream = externalResponse.body;
        
        // Set the appropriate Content-Type header on our response
        if (contentType) {
            response.setHeader('Content-Type', contentType);
        }

        // Pipe the body stream from the external response directly to our Vercel response
        // This sends the data chunk by chunk without loading the whole file into memory.
        // Vercel's response object is compatible with Node.js streams.
        bodyStream.pipe(response);

    } catch (error) {
        console.error('Proxy Error:', error);
        return response.status(500).send(`Server error: ${error.message}`);
    }
}
