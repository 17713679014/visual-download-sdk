export interface StorageConfig {
    dbName: string;
    storeName: string;
}

export interface TaskProgress {
    taskId: string;
    loaded: number;
    total: number;
    progress: number;
    speed: string;
}

export interface TaskMetadata {
    taskId: string;
    fileUrl: string;
    filename: string;
    status: string;
    progress: number;
    loaded: number;
    total: number;
    speed: string;
    error?: string;
}

export interface DownloadFile {
    taskId: string;
    fileUrl: string;
    filename: string;
    fileSize: number;
    chunkSize?: number;
}

export interface SDKConfig {
    userId: string;
    maxConcurrentDownloads?: number;
    storage?: StorageConfig;
    onProgress?: (progress: TaskProgress) => void;
    onError?: (error: Error) => void;
}

export interface RequestOptions {
    headers?: Record<string, string>;
    signal?: AbortSignal;
} 