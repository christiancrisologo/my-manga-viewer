import { useState } from 'react';

export function useWebExtraction() {
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const extractImagesFromUrl = async (url: string, rule: string, hostname: string) => {
        setIsExtracting(true);
        setError(null);
        try {
            const response = await fetch(`${hostname}/extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, rule })
            });

            if (!response.ok) throw new Error('Extraction failed');

            const data = await response.json();
            return data.images || [];
        } catch (err: any) {
            console.error('Extraction error:', err);
            setError(err.message || 'Failed to extract images');
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
