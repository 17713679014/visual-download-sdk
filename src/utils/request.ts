export interface RequestOptions {
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

class Request {
    async get(url: string, options: RequestOptions = {}): Promise<ArrayBuffer> {
        const response = await fetch(url, {
            method: 'GET',
            headers: options.headers,
            signal: options.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.arrayBuffer();
    }

    isCancel(error: any): boolean {
        return error.name === 'AbortError';
    }
}

export const request = new Request(); 