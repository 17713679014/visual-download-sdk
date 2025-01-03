import { DownloadTask } from './DownloadTask';
import { FILE_STATUS } from '../constants';
import { request } from '../utils/request';
import type { DownloadFile, TaskMetadata, TaskProgress } from '../types';
import { Storage } from '../utils/storage';

export class DownloadManager {
    private tasks: Map<string, DownloadTask> = new Map();
    private storage: Storage;
    private userId: string;
    private maxConcurrentDownloads: number;
    private onProgress?: (progress: TaskProgress) => void;
    private onError?: (error: Error) => void;
    private activeDownloads = 0;
    private subscribers: Set<(tasks: TaskMetadata[]) => void> = new Set();

    constructor(config: {
        userId: string;
        storage: Storage;
        maxConcurrentDownloads?: number;
        onProgress?: (progress: TaskProgress) => void;
        onError?: (error: Error) => void;
    }) {
        this.userId = config.userId;
        this.storage = config.storage;
        this.maxConcurrentDownloads = config.maxConcurrentDownloads || 3;
        this.onProgress = config.onProgress;
        this.onError = config.onError;
    }

    /**
     * 创建下载任务
     */
    async createTask(fileInfo: DownloadFile): Promise<DownloadTask> {
        console.log(`[DownloadManager] Creating task for ${fileInfo.filename}`);
        
        const taskStorage = new Storage({
            dbName: `download_${this.userId}`,
            storeName: `task_${fileInfo.taskId}`
        });

        const task = new DownloadTask({
            ...fileInfo,
            storage: taskStorage
        });

        // 初始化任务
        await task.initialize();

        // 设置事件监听
        task.on('progress', (progress: TaskProgress) => {
            this.onProgress?.(progress);
            this.notifySubscribers();
        });

        task.on('error', (error: Error) => {
            this.onError?.(error);
            this.notifySubscribers();
        });

        task.on('complete', () => {
            this.activeDownloads--;
            this.notifySubscribers();
            this.startNextDownload();
        });

        task.on('pause', () => {
            this.activeDownloads--;
            this.notifySubscribers();
            this.startNextDownload();
        });

        this.tasks.set(fileInfo.taskId, task);
        this.notifySubscribers();

        // 尝试开始下载
        if (this.activeDownloads < this.maxConcurrentDownloads) {
            this.activeDownloads++;
            await task.downloadChunks().catch(error => {
                // 只有非暂停错误才抛出
                if (error instanceof Error && error.message !== 'DOWNLOAD_CANCELED') {
                    throw error;
                }
            });
        }

        return task;
    }

    private async startNextDownload(): Promise<void> {
        if (this.activeDownloads >= this.maxConcurrentDownloads) {
            return;
        }

        const waitingTask = Array.from(this.tasks.values()).find(
            task => task.getMetadata().status === FILE_STATUS.WAITING
        );

        if (waitingTask) {
            this.activeDownloads++;
            try {
                await waitingTask.downloadChunks();
            } catch (error) {
                if (!request.isCancel(error)) {
                    if (this.onError) {
                        this.onError(error as Error);
                    }
                }
            } finally {
                this.activeDownloads--;
                this.startNextDownload();
            }
        }
    }

    /**
     * 获取任务实例
     */
    getTask(taskId: string): DownloadTask | undefined {
        return this.tasks.get(taskId);
    }

    /**
     * 暂停指定任务
     */
    async pauseTask(taskId: string): Promise<void> {
        const task = this.getTask(taskId);
        if (task) {
            await task.pause();
            this.notifySubscribers();
        }
    }

    /**
     * 恢复指定任务
     */
    async resumeTask(taskId: string): Promise<void> {
        const task = this.getTask(taskId);
        if (task) {
            await task.resume();
            this.startNextDownload();
            this.notifySubscribers();
        }
    }

    /**
     * 移除任务
     */
    async removeTask(taskId: string): Promise<void> {
        const task = this.getTask(taskId);
        if (task) {
            // 先从管理器中移除任务
            this.tasks.delete(taskId);
            // 然后清理任务数据
            await task.clearChunks();
            this.notifySubscribers();
        }
    }

    /**
     * 暂停所有任务
     */
    async pauseAllTasks(): Promise<void> {
        const promises = Array.from(this.tasks.values())
            .filter(task => task.getMetadata().status === FILE_STATUS.UPLOADING)
            .map(task => task.pause());
        await Promise.all(promises);
        this.notifySubscribers();
    }

    /**
     * 恢复所有任务
     */
    async resumeAllTasks(): Promise<void> {
        const promises = Array.from(this.tasks.values())
            .filter(task => task.getMetadata().status === FILE_STATUS.PAUSE)
            .map(task => task.resume());
        await Promise.all(promises);
        this.startNextDownload();
        this.notifySubscribers();
    }

    /**
     * 获取下载列表
     */
    getDownloadList(): TaskMetadata[] {
        return Array.from(this.tasks.values()).map(task => task.getMetadata());
    }

    /**
     * 订阅下载状态变化
     */
    subscribe(listener: (list: TaskMetadata[]) => void): () => void {
        this.subscribers.add(listener);
        listener(this.getDownloadList());
        return () => this.subscribers.delete(listener);
    }

    /**
     * 通知所有订阅者
     */
    private notifySubscribers(): void {
        const list = this.getDownloadList();
        this.subscribers.forEach((listener: (list: TaskMetadata[]) => void) => listener(list));
    }

    /**
     * 销毁管理器
     */
    async destroy(): Promise<void> {
        // 先暂停所有任务
        await this.pauseAllTasks();
        
        // 清理所有任务
        const promises = Array.from(this.tasks.values()).map(task => task.clearChunks());
        await Promise.all(promises);
        
        this.subscribers.clear();
        this.tasks.clear();
        await this.storage.close();
    }
}