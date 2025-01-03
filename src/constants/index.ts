/**
 * SDK常量定义
 */

export const FILE_STATUS = {
    WAITING: 'waiting',
    UPLOADING: 'uploading',
    PAUSE: 'pause',
    SUCCESS: 'success',
    ERROR: 'error'
} as const;

export const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB

export const ERROR_CODES = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    STORAGE_ERROR: 'STORAGE_ERROR',
    DOWNLOAD_CANCELED: 'DOWNLOAD_CANCELED',
    INVALID_RESPONSE: 'INVALID_RESPONSE'
} as const;

export const STORAGE_KEYS = {
    TASK_METADATA: 'taskMetadata',
    CHUNK_DATA: 'chunkData'
} as const;