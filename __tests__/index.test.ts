import { VisualDownloadSDK } from '../src';
import { FILE_STATUS } from '../src/constants';
import { mockAxios } from './mocks/axios';

describe('VisualDownloadSDK', () => {
    let sdk: VisualDownloadSDK;
    const mockConfig = {
        userId: 'test-user'
    };

    beforeEach(() => {
        sdk = new VisualDownloadSDK(mockConfig);
        mockAxios.get.mockClear();
    });

    it('should create download task', async () => {
        const taskId = 'task-1';
        await sdk.download({
            taskId,
            fileUrl: 'http://example.com/test.zip',
            filename: 'test.zip',
            fileSize: 1024
        });

        const list = sdk.getDownloadList();
        expect(list).toHaveLength(1);
        expect(list[0].taskId).toBe(taskId);
    });

    it('should handle task control operations', async () => {
        const taskId = 'task-1';
        await sdk.download({
            taskId,
            fileUrl: 'http://example.com/test.zip',
            filename: 'test.zip',
            fileSize: 1024
        }).catch(() => {});

        await sdk.pause(taskId);
        let list = sdk.getDownloadList();
        expect(list[0].status).toBe(FILE_STATUS.PAUSE);

        await sdk.resume(taskId);
        list = sdk.getDownloadList();
        expect(list[0].status).toBe(FILE_STATUS.UPLOADING);

        await sdk.remove(taskId);
        list = sdk.getDownloadList();
        expect(list).toHaveLength(0);
    });

    it('should handle progress updates', async () => {
        const progressSpy = jest.fn();
        const sdk = new VisualDownloadSDK({
            ...mockConfig,
            onProgress: progressSpy
        });

        mockAxios.get.mockImplementation(() => {
            return Promise.resolve({
                data: new ArrayBuffer(512),
                headers: { 'content-length': '1024' }
            });
        });

        await sdk.download({
            taskId: 'task-1',
            fileUrl: 'http://example.com/test.zip',
            filename: 'test.zip',
            fileSize: 1024
        });

        expect(progressSpy).toHaveBeenCalled();
        const progress = progressSpy.mock.calls[0][0];
        expect(progress).toMatchObject({
            taskId: 'task-1',
            loaded: expect.any(Number),
            total: 1024,
            progress: expect.any(Number)
        });
    });

    it('should handle error cases', async () => {
        const errorSpy = jest.fn();
        const sdk = new VisualDownloadSDK({
            ...mockConfig,
            onError: errorSpy
        });

        mockAxios.get.mockRejectedValueOnce(new Error('Network error'));

        try {
            await sdk.download({
                taskId: 'task-1',
                fileUrl: 'http://example.com/test.zip',
                filename: 'test.zip',
                fileSize: 1024
            });
            throw new Error('Should have thrown an error');
        } catch (err) {
            const error = err as Error;
            expect(error.message).toBe('Network error');
            expect(errorSpy).toHaveBeenCalled();
        }
    });

    it('should cleanup resources on destroy', async () => {
        await sdk.download({
            taskId: 'task-1',
            fileUrl: 'http://example.com/test.zip',
            filename: 'test.zip',
            fileSize: 1024
        });

        const listenerSpy = jest.fn();
        sdk.subscribe(listenerSpy);

        await sdk.destroy();

        expect(sdk.getDownloadList()).toHaveLength(0);
        expect(listenerSpy).not.toHaveBeenCalled();
    });

    it('should handle concurrent downloads', async () => {
        const sdk = new VisualDownloadSDK({
            ...mockConfig,
            maxConcurrentDownloads: 2
        });

        await Promise.all([
            sdk.download({
                taskId: 'task-1',
                fileUrl: 'http://example.com/1.zip',
                filename: '1.zip',
                fileSize: 1024
            }),
            sdk.download({
                taskId: 'task-2',
                fileUrl: 'http://example.com/2.zip',
                filename: '2.zip',
                fileSize: 1024
            }),
            sdk.download({
                taskId: 'task-3',
                fileUrl: 'http://example.com/3.zip',
                filename: '3.zip',
                fileSize: 1024
            })
        ]);

        const list = sdk.getDownloadList();
        const activeTasks = list.filter(task => task.status === FILE_STATUS.UPLOADING);
        expect(activeTasks.length).toBeLessThanOrEqual(2);
    });
}); 