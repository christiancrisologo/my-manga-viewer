import { useState } from 'react';

export function useWebExtraction() {
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const extractImagesFromUrl = async (url: string, rule: string) => {
        setIsExtracting(true);
        setError(null);
        try {
            // Use public allorigins JSON API proxy for reliable client-side CORS bypassing
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);

            if (!response.ok) {
                throw new Error('Public proxy failed to fetch the page content.');
            }

            const data = await response.json();
            const html = data.contents; // The HTML is wrapped in the 'contents' property

            // Use browser's native DOMParser to parse the HTML string
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const images: string[] = [];
            const selector = rule || 'img';
            const elements = doc.querySelectorAll(selector);

            elements.forEach((el) => {
                const img = el as HTMLImageElement;
                let src = img.getAttribute('src') ||
                    img.getAttribute('data-src') ||
                    img.getAttribute('data-lazy-src') ||
                    img.getAttribute('srcset');

                if (src) {
                    // Handle srcset (take the first URL)
                    if (src.includes(' ')) {
                        src = src.split(' ')[0];
                    }

                    try {
                        // Resolve relative URLs using the original URL
                        const absoluteUrl = new URL(src, url).href;
                        if (!images.includes(absoluteUrl)) {
                            images.push(absoluteUrl);
                        }
                    } catch (e) {
                        console.error(`Failed to parse URL: ${src}`);
                    }
                }
            });

            return images;
        } catch (err: any) {
            console.error('Extraction error:', err);
            setError(err.message || 'Failed to extract images client-side');
            throw err;
        } finally {
            setIsExtracting(false);
        }
    };

    return {
        isExtracting,
        error,
        extractImagesFromUrl
    };
}
