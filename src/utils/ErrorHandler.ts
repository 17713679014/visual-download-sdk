import { ERROR_CODES } from '../constants';

export class DownloadError extends Error {
    code: string;
    
    constructor(code: keyof typeof ERROR_CODES, message?: string) {
        super(message || code);
        this.code = ERROR_CODES[code];
        this.name = 'DownloadError';
    }
}

export class ErrorHandler {
    static handle(error: any): DownloadError {
        if (error instanceof DownloadError) {
            return error;
        }

        // 网络错误
        if (error.isAxiosError) {
            return new DownloadError(
                'NETWORK_ERROR',
                `Network request failed: ${error.message}`
            );
        }

        // 存储错误
        if (error.name === 'QuotaExceededError') {
            return new DownloadError(
                'STORAGE_ERROR',
                'Storage quota exceeded'
            );
        }

        // 其他错误
        return new DownloadError(
            'INVALID_RESPONSE',
            error.message || 'Unknown error occurred'
        );
    }

    static isDownloadError(error: any): error is DownloadError {
        return error instanceof DownloadError;
    }
} 