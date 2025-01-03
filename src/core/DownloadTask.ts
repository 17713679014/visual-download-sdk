// DownloadTask 类 - 单个下载任务的管理
import { EventEmitter } from '../utils/EventEmitter';
import { Storage } from '../utils/storage';
import { request } from '../utils/request';
import { FILE_STATUS } from '../constants';
import type { TaskMetadata, TaskProgress } from '../types';
import { formatSpeed, calculateProgress } from '../utils';

export class DownloadTask extends EventEmitter {
    private storage: Storage;
    private metadata: TaskMetadata;
    private chunks: Map<number, { start: number; end: number; data: ArrayBuffer }> = new Map();
    private controller: AbortController | null = null;
    private lastTime: number = Date.now();
    private lastLoaded: number = 0;
    private chunkSize: number = 1024 * 1024; // 1MB

    constructor(config: {
        taskId: string;
        fileUrl: string;
        filename: string;
        fileSize: number;
        storage: Storage;
    }) {
        super();

        this.storage = config.storage;
        this.metadata = {
            taskId: config.taskId,
            fileUrl: config.fileUrl,
            filename: config.filename,
            status: FILE_STATUS.WAITING,
            progress: 0,
            loaded: 0,
            total: config.fileSize,
            speed: '0 KB/s'
        };

        // 计算分片
        const totalChunks = Math.ceil(config.fileSize / this.chunkSize);
        for (let i = 0; i < totalChunks; i++) {
            const start = i * this.chunkSize;
            const end = Math.min(start + this.chunkSize, config.fileSize) - 1;
            this.chunks.set(i, {
                start,
                end,
                data: new ArrayBuffer(0)
            });
        }
    }

    async initialize(): Promise<void> {
        await this.storage.initialize();
        // 尝试恢复之前的进度
        const savedMetadata = await this.storage.get<TaskMetadata>('metadata');
        if (savedMetadata) {
            this.metadata = savedMetadata;
        }
        // 加载已下载的分片
        const savedChunks = await this.storage.get<Map<number, { start: number; end: number; data: ArrayBuffer }>>('chunks');
        if (savedChunks) {
            this.chunks = savedChunks;
            this.updateProgress();
        }
    }

    private updateProgress(): void {
        const totalLoaded = Array.from(this.chunks.values())
            .reduce((sum, chunk) => sum + chunk.data.byteLength, 0);
        
        this.metadata.loaded = totalLoaded;
        this.metadata.progress = calculateProgress(totalLoaded, this.metadata.total);
        
        this.emit('progress', this.getProgress());
    }

    async downloadChunks(): Promise<void> {
        if (this.metadata.status === FILE_STATUS.SUCCESS) {
            console.log(`[DownloadTask] Task ${this.metadata.taskId} already completed`);
            return;
        }

        if (this.metadata.status === FILE_STATUS.PAUSE) {
            console.log(`[DownloadTask] Task ${this.metadata.taskId} is paused`);
            return;
        }
        
        try {
            console.log(`[DownloadTask] Starting download for ${this.metadata.filename}`);
            this.metadata.status = FILE_STATUS.UPLOADING;
            
            // 创建一个 Blob 来存储所有分片
            const chunks: ArrayBuffer[] = [];
            
            for (const [index, chunk] of this.chunks.entries()) {
                // 检查是否已暂停
                if (this.metadata.status === FILE_STATUS.PAUSE) {
                    console.log(`[DownloadTask] Download paused for ${this.metadata.filename}`);
                    throw new Error('DOWNLOAD_CANCELED');
                }

                if (chunk.data.byteLength === 0) {
                    console.log(`[DownloadTask] Downloading chunk ${index + 1}/${this.chunks.size}`);
                    try {
                        if (!this.controller) {
                            this.controller = new AbortController();
                        }

                        const response = await request.get(this.metadata.fileUrl, {
                            headers: {
                                Range: `bytes=${chunk.start}-${chunk.end}`
                            },
                            signal: this.controller?.signal
                        });

                        // 再次检查是否已暂停
                        if (this.metadata.status === FILE_STATUS.PAUSE) {
                            console.log(`[DownloadTask] Download paused after chunk download`);
                            throw new Error('DOWNLOAD_CANCELED');
                        }

                        this.chunks.set(index, {
                            ...chunk,
                            data: response
                        });
                        
                        chunks.push(response);
                        
                        console.log(`[DownloadTask] Chunk ${index + 1} downloaded successfully`);
                        this.updateProgress();
                        this.updateSpeed(response.byteLength);

                        await this.storage.set('chunks', this.chunks);
                        await this.storage.set('metadata', this.metadata);
                    } catch (error: unknown) {
                        console.error(`[DownloadTask] Error downloading chunk ${index + 1}:`, error);
                        if (
                            request.isCancel(error) || 
                            (error instanceof Error && error.message === 'DOWNLOAD_CANCELED')
                        ) {
                            this.metadata.status = FILE_STATUS.PAUSE;
                            await this.storage.set('metadata', this.metadata);
                            throw new Error('DOWNLOAD_CANCELED');
                        }
                        throw error;
                    }
                } else {
                    chunks.push(chunk.data);
                }
            }

            // 创建最终的 Blob
            console.log(`[DownloadTask] Creating final blob for ${this.metadata.filename}`);
            const blob = new Blob(chunks, { type: 'application/octet-stream' });
            
            // 触发下载
            console.log(`[DownloadTask] Triggering download for ${this.metadata.filename}`);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.metadata.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log(`[DownloadTask] Download completed for ${this.metadata.filename}`);
            this.metadata.status = FILE_STATUS.SUCCESS;
            this.emit('complete', this.getMetadata());

        } catch (error: unknown) {
            console.error(`[DownloadTask] Download failed:`, error);
            if (error instanceof Error && error.message === 'DOWNLOAD_CANCELED') {
                console.log(`[DownloadTask] Download canceled for ${this.metadata.filename}`);
                this.emit('pause'); // 触发暂停事件
                return;
            }
            if (!request.isCancel(error)) {
                this.metadata.status = FILE_STATUS.ERROR;
                this.metadata.error = error instanceof Error ? error.message : String(error);
                this.emit('error', error);
            }
            throw error;
        }
    }

    private updateSpeed(bytes: number): void {
        const now = Date.now();
        const timeDiff = now - this.lastTime;
        
        if (timeDiff >= 1000) {
            const bytesPerSecond = ((bytes - this.lastLoaded) * 1000) / timeDiff;
            this.metadata.speed = formatSpeed(bytesPerSecond);
            this.lastLoaded = bytes;
            this.lastTime = now;
        }
    }

    getProgress(): TaskProgress {
        return {
            taskId: this.metadata.taskId,
            loaded: this.metadata.loaded,
            total: this.metadata.total,
            progress: calculateProgress(this.metadata.loaded, this.metadata.total),
            speed: this.metadata.speed
        };
    }

    getMetadata(): TaskMetadata {
        return { ...this.metadata };
    }

    async pause(): Promise<void> {
        console.log(`[DownloadTask] Pausing download for ${this.metadata.filename}`);
        this.metadata.status = FILE_STATUS.PAUSE;
        if (this.controller) {
            this.controller.abort();
            this.controller = null;
        }
        await this.storage.set('metadata', this.metadata);
        this.emit('progress', this.getProgress());
        this.emit('pause'); // 触发暂停事件
    }

    async resume(): Promise<void> {
        console.log(`[DownloadTask] Resuming download for ${this.metadata.filename}`);
        this.metadata.status = FILE_STATUS.UPLOADING;
        if (!this.controller) {
            this.controller = new AbortController();
        }
        await this.downloadChunks();
    }

    async retry(): Promise<void> {
        this.metadata.error = undefined;
        this.metadata.status = FILE_STATUS.UPLOADING;
        await this.downloadChunks();
    }

    async clearChunks(): Promise<void> {
        console.log(`[DownloadTask] Clearing chunks for ${this.metadata.filename}`);
        try {
            await this.storage.clear();
            await this.storage.deleteStore(); // 删除 store
            await this.storage.close();
            
            // 重置状态
            this.chunks = new Map();
            this.metadata.loaded = 0;
            this.metadata.progress = 0;
            this.metadata.status = FILE_STATUS.WAITING;
            
            console.log(`[DownloadTask] Chunks cleared successfully`);
        } catch (error) {
            console.error(`[DownloadTask] Error clearing chunks:`, error);
            throw error;
        }
    }
}