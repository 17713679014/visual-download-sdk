/**
 * SDK入口文件
 * 
 * 功能:
 * - 导出SDK主类
 * - 导出类型定义
 * - 导出常量
 */
import { DownloadManager } from './core/DownloadManager';
import type { DownloadFile, TaskMetadata, SDKConfig } from './types';
import { Storage } from './utils/storage';

export class VisualDownloadSDK {
    private manager: DownloadManager;

    constructor(config: SDKConfig) {
        const storageConfig = config.storage || {
            dbName: `visual-download-${config.userId}`,
            storeName: 'downloads'
        };

        const storage = new Storage(storageConfig);
        
        this.manager = new DownloadManager({
            userId: config.userId,
            storage,
            maxConcurrentDownloads: config.maxConcurrentDownloads,
            onProgress: config.onProgress,
            onError: config.onError
        });
    }

    /**
     * 开始下载
     */
    async download(fileInfo: DownloadFile): Promise<void> {
        const task = await this.manager.createTask(fileInfo);
        await task.downloadChunks().catch(error => {
            if (error.message !== 'DOWNLOAD_CANCELED') {
                throw error;
            }
        });
    }

    /**
     * 暂停下载
     */
    async pause(taskId: string): Promise<void> {
        await this.manager.pauseTask(taskId);
    }

    /**
     * 恢复下载
     */
    async resume(taskId: string): Promise<void> {
        await this.manager.resumeTask(taskId);
    }

    /**
     * 重试下载
     */
    async retry(taskId: string): Promise<void> {
        const task = this.manager.getTask(taskId);
        if (task) {
            await task.retry();
        }
    }

    /**
     * 移除下载任务
     */
    async remove(taskId: string): Promise<void> {
        await this.manager.removeTask(taskId);
    }

    /**
     * 暂停所有任务
     */
    async pauseAll(): Promise<void> {
        await this.manager.pauseAllTasks();
    }

    /**
     * 恢复所有任务
     */
    async resumeAll(): Promise<void> {
        await this.manager.resumeAllTasks();
    }

    /**
     * 获取下载列表
     */
    getDownloadList(): TaskMetadata[] {
        return this.manager.getDownloadList();
    }

    /**
     * 订阅下载状态变化
     */
    subscribe(listener: (list: TaskMetadata[]) => void): () => void {
        return this.manager.subscribe(listener);
    }

    /**
     * 销毁SDK实例
     */
    async destroy(): Promise<void> {
        await this.manager.destroy();
    }
}

export * from './types';
export * from './constants'; 