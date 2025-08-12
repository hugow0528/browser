// File: /api/proxy.js

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { url } = request.body;

    // Basic URL validation
    if (!url || !url.startsWith('http')) {
        return response.status(400).json({ error: 'A valid URL starting with http or https is required.' });
    }

    try {
        // Fetch the content from the target URL
        // We pass along some common headers to make the request look more like a real browser
        const targetResponse = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        // Get the HTML content as text
        const pageContent = await targetResponse.text();
        const contentType = targetResponse.headers.get('content-type') || 'text/html';

        // Send the fetched content back to our frontend
        // Set the Content-Type header to match the original response
        response.setHeader('Content-Type', contentType);
        response.status(200).send(pageContent);

    } catch (error) {
        console.error('Error fetching the target URL:', error);
        response.status(500).json({ error: `Failed to fetch the URL. Reason: ${error.message}` });
    }
}
