/**
 * SDK类型定义
 * 
 * 包含:
 * - 下载文件信息类型
 * - SDK配置类型
 * - 任务元数据类型
 * - 任务进度类型
 * - 分片数据类型
 */

export interface DownloadFile {
    taskId: string;
    fileUrl: string;
    filename: string;
    fileSize: number;
    chunkSize?: number;
    dlinkParams?: any;
}

export interface SDKConfig {
    userId: string;
    chunkSize?: number;
    maxConcurrentDownloads?: number;
    onError?: (error: Error) => void;
    onProgress?: (progress: TaskProgress) => void;
    retryTimes?: number;
    timeout?: number;
}

export interface TaskMetadata {
    taskId: string;
    filename: string;
    fileLength: number;
    status: string;
    createdAt: number;
    lastUpdated: number;
    chunkSize: number;
    progress: number;
    speed: string;
    speedNum: number;
    error?: string;
}

export interface TaskProgress {
    taskId: string;
    loaded: number;
    total: number;
    speed: string;
    progress: number;
}

export interface ChunkData {
    index: number;
    start: number;
    end: number;
    data: ArrayBuffer;
} 