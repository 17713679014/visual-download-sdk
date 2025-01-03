/**
 * SDK工具函数
 */

/**
 * 格式化文件大小
 */
export function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化下载速度
 */
export function formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s';

    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let size = bytesPerSecond;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 计算进度百分比
 */
export function calculateProgress(loaded: number, total: number): number {
    if (total === 0) return 0;
    const progress = (loaded / total) * 100;
    return Math.min(Math.round(progress * 100) / 100, 100); // 保留2位小数,不超过100
}

/**
 * 生成分片信息
 */
export function generateChunks(fileSize: number, chunkSize: number): Array<[number, number]> {
    const chunks: Array<[number, number]> = [];
    let start = 0;
    
    while (start < fileSize) {
        const end = Math.min(start + chunkSize, fileSize);
        chunks.push([start, end - 1]);
        start = end;
    }
    
    return chunks;
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export async function retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0) throw error;
        
        // 如果是取消操作,直接抛出错误
        if (error instanceof Error && error.message === 'DOWNLOAD_CANCELED') {
            throw error;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        return retry(fn, retries - 1, delay);
    }
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串 (例如: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
export function generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * 防抖函数
 * @param fn 要执行的函数
 * @param delay 延迟时间(毫秒)
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 300
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return function(this: any, ...args: Parameters<T>) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * 节流函数
 * @param fn 要执行的函数
 * @param limit 时间限制(毫秒)
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
    fn: T,
    limit: number = 300
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    let lastResult: ReturnType<T>;
    
    return function(this: any, ...args: Parameters<T>) {
        if (!inThrottle) {
            inThrottle = true;
            lastResult = fn.apply(this, args);
            setTimeout(() => inThrottle = false, limit);
        }
        return lastResult;
    };
} 