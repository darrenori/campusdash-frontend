const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const apiRequest = {
    async post(endpoint, data) {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }
        
        return result;
    }
};