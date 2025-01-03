import { DownloadTask } from '../../src/core/DownloadTask';
import { FILE_STATUS } from '../../src/constants';
import { mockAxios } from '../mocks/axios';

describe('DownloadTask', () => {
    const mockConfig = {
        dbName: 'test-db',
        storeName: 'test-store'
    };

    beforeEach(() => {
        mockAxios.get.mockClear();
    });

    it('should create a download task', async () => {
        const task = await DownloadTask.createTask(
            'http://example.com/test.zip',
            'task-1',
            mockConfig,
            1024,
            'test.zip',
            1024
        );

        const metadata = task.getMetadata();
        expect(metadata.taskId).toBe('task-1');
        expect(metadata.fileLength).toBe(1024);
        expect(metadata.filename).toBe('test.zip');
        expect(metadata.status).toBe(FILE_STATUS.WAITING);
    });

    it('should handle download progress', async () => {
        jest.useFakeTimers();
        
        const task = await DownloadTask.createTask(
            'test://example.com/test.zip',
            'task-1',
            mockConfig,
            1024,
            'test.zip',
            1024
        );

        const progressPromise = task.downloadChunks();
        jest.runAllTimers();
        await progressPromise;

        const progress = task.getProgress();
        expect(progress.loaded).toBeGreaterThan(0);
        
        jest.useRealTimers();
    });

    it('should pause and resume download', async () => {
        const task = await DownloadTask.createTask(
            'http://example.com/test.zip',
            'task-1',
            mockConfig,
            1024,
            'test.zip',
            1024
        );

        await task.pause();
        const pausedMetadata = task.getMetadata();
        expect(pausedMetadata.status).toBe(FILE_STATUS.PAUSE);

        await task.resume();
        const resumedMetadata = task.getMetadata();
        expect(resumedMetadata.status).toBe(FILE_STATUS.UPLOADING);
    });

    it('should handle network error', async () => {
        const task = await DownloadTask.createTask(
            'http://example.com/test.zip',
            'task-1',
            mockConfig,
            1024,
            'test.zip',
            1024
        );

        mockAxios.get.mockRejectedValueOnce(new Error('Network Error'));

        await task.downloadChunks().catch(() => {});
        const metadata = task.getMetadata();
        expect(metadata.status).toBe(FILE_STATUS.ERROR);
        expect(metadata.error).toBe('Network Error');
    });

    it('should handle speed calculation', async () => {
        const task = await DownloadTask.createTask(
            'http://example.com/test.zip',
            'task-1',
            mockConfig,
            1024,
            'test.zip',
            1024 * 1024 // 1MB
        );

        const mockData = new ArrayBuffer(1024 * 1024); // 1MB
        mockAxios.get.mockResolvedValueOnce({
            data: mockData,
            headers: { 'content-length': String(mockData.byteLength) },
            status: 200,
            statusText: 'OK'
        });

        // 使用 fake timers
        jest.useFakeTimers();
        
        const downloadPromise = task.downloadChunks();
        jest.advanceTimersByTime(1000);
        await downloadPromise;

        const progress = task.getProgress();
        expect(progress.speed).toBe('1.00 MB/s');
        
        jest.useRealTimers();
    });

    it('should clean up resources', async () => {
        const task = await DownloadTask.createTask(
            'http://example.com/test.zip',
            'task-1',
            mockConfig,
            1024,
            'test.zip',
            1024
        );

        await task.clearChunks();
        const metadata = task.getMetadata();
        expect(metadata.progress).toBe(0);
    });
}); 