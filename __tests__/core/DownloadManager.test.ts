import { DownloadManager } from '../../src/core/DownloadManager';
import { FILE_STATUS } from '../../src/constants';
import { mockAxios } from '../mocks/axios';
import { clearIndexedDB } from '../utils/testHelpers';

describe('DownloadManager', () => {
    let manager: DownloadManager;
    const mockConfig = {
        userId: 'test-user',
        maxConcurrentDownloads: 2
    };

    beforeEach(async () => {
        await clearIndexedDB();
        manager = new DownloadManager(mockConfig);
        mockAxios.get.mockClear();
    });

    it('should create download task', async () => {
        const task = await manager.createTask({
            taskId: 'task-1',
            fileUrl: 'http://example.com/test.zip',
            filename: 'test.zip',
            fileSize: 1024
        });

        expect(task).toBeDefined();
        const metadata = task.getMetadata();
        expect(metadata.taskId).toBe('task-1');
    });

    it('should manage concurrent downloads', async () => {
        await Promise.all([
            manager.createTask({
                taskId: 'task-1',
                fileUrl: 'test://example.com/1.zip',
                filename: '1.zip',
                fileSize: 1024
            }),
            manager.createTask({
                taskId: 'task-2',
                fileUrl: 'test://example.com/2.zip',
                filename: '2.zip',
                fileSize: 1024
            }),
            manager.createTask({
                taskId: 'task-3',
                fileUrl: 'test://example.com/3.zip',
                filename: '3.zip',
                fileSize: 1024
            })
        ]);

        const activeCount = manager.getActiveTaskCount();
        expect(activeCount).toBeLessThanOrEqual(mockConfig.maxConcurrentDownloads);
    });

    it('should pause and resume task', async () => {
        const task = await manager.createTask({
            taskId: 'task-1',
            fileUrl: 'http://example.com/test.zip',
            filename: 'test.zip',
            fileSize: 1024
        });

        await manager.pauseTask('task-1');
        const pausedMetadata = task.getMetadata();
        expect(pausedMetadata.status).toBe(FILE_STATUS.PAUSE);

        await manager.resumeTask('task-1');
        const resumedMetadata = task.getMetadata();
        expect(resumedMetadata.status).toBe(FILE_STATUS.UPLOADING);
    });

    it('should remove task', async () => {
        mockAxios.get.mockResolvedValueOnce({
            data: new ArrayBuffer(1024),
            headers: { 'content-length': '1024' }
        });

        await manager.createTask({
            taskId: 'task-1',
            fileUrl: 'http://example.com/test.zip',
            filename: 'test.zip',
            fileSize: 1024
        });

        await manager.removeTask('task-1');
        expect(manager.getTask('task-1')).toBeUndefined();
    });

    it('should notify listeners when task status changes', async () => {
        const listenerSpy = jest.fn();
        manager.subscribe(listenerSpy);

        mockAxios.get.mockResolvedValueOnce({
            data: new ArrayBuffer(1024),
            headers: { 'content-length': '1024' }
        });

        await manager.createTask({
            taskId: 'task-1',
            fileUrl: 'http://example.com/test.zip',
            filename: 'test.zip',
            fileSize: 1024
        });

        expect(listenerSpy).toHaveBeenCalled();
        const lastCall = listenerSpy.mock.calls[listenerSpy.mock.calls.length - 1][0];
        expect(lastCall).toEqual(expect.arrayContaining([
            expect.objectContaining({
                taskId: 'task-1',
                status: FILE_STATUS.WAITING
            })
        ]));
    });

    it('should handle pause all tasks', async () => {
        const tasks = await Promise.all([
            manager.createTask({
                taskId: 'task-1',
                fileUrl: 'http://example.com/1.zip',
                filename: '1.zip',
                fileSize: 1024
            }),
            manager.createTask({
                taskId: 'task-2',
                fileUrl: 'http://example.com/2.zip',
                filename: '2.zip',
                fileSize: 1024
            })
        ]);

        tasks.forEach(task => {
            task.downloadChunks().catch(() => {
            });
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        await manager.pauseAllTasks();

        const taskList = manager.getDownloadList();
        expect(taskList.every(task => task.status === FILE_STATUS.PAUSE)).toBe(true);
    });

    it('should handle resume all tasks', async () => {
        const tasks = await Promise.all([
            manager.createTask({
                taskId: 'task-1',
                fileUrl: 'http://example.com/1.zip',
                filename: '1.zip',
                fileSize: 1024
            }),
            manager.createTask({
                taskId: 'task-2',
                fileUrl: 'http://example.com/2.zip',
                filename: '2.zip',
                fileSize: 1024
            })
        ]);

        tasks.forEach(task => {
            task.downloadChunks().catch(() => {
            });
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        await manager.pauseAllTasks();
        await manager.resumeAllTasks();

        const taskList = manager.getDownloadList();
        expect(taskList.every(task => task.status === FILE_STATUS.UPLOADING)).toBe(true);
    });

    it('should cleanup on destroy', async () => {
        await manager.createTask({
            taskId: 'task-1',
            fileUrl: 'http://example.com/test.zip',
            filename: 'test.zip',
            fileSize: 1024
        });

        const listenerSpy = jest.fn();
        const unsubscribe = manager.subscribe(listenerSpy);
        listenerSpy.mockClear();

        await manager.destroy();
        
        expect(manager.getDownloadList()).toHaveLength(0);
        expect(listenerSpy).not.toHaveBeenCalled();
        unsubscribe();
    });
}); 