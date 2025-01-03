/**
 * SDK类型定义
 */

export interface SDKConfig {
    userId: string;
    maxConcurrentDownloads?: number;
    chunkSize?: number;
    onProgress?: (progress: TaskProgress) => void;
    onError?: (error: Error) => void;
}

export interface DownloadFile {
    taskId: string;
    fileUrl: string;
    filename: string;
    fileSize: number;
    chunkSize?: number;
}

export interface TaskMetadata {
    taskId: string;
    filename: string;
    fileLength: number;
    status: string;
    progress: number;
    speed: string;
    error?: string;
}

export interface TaskProgress {
    taskId: string;
    loaded: number;
    total: number;
    progress: number;
    speed: string;
}

export interface ChunkData {
    index: number;
    start: number;
    end: number;
    data?: ArrayBuffer;
}

export interface StorageConfig {
    dbName: string;
    storeName: string;
} 