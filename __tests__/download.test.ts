import { VisualDownloadSDK } from '../src';
import { FILE_STATUS } from '../src/constants';
import type { TaskMetadata } from '../src/types';
import { mockAxios } from './mocks/axios';
import { clearIndexedDB } from './utils/testHelpers';

describe('Visual Download SDK', () => {
    let sdk: VisualDownloadSDK;
    
    beforeEach(async () => {
        await clearIndexedDB();
        sdk = new VisualDownloadSDK({
            userId: 'test-user'
        });
        mockAxios.get.mockClear();
    });

    it('should download file with progress', async () => {
        const progressSpy = jest.fn();
        sdk = new VisualDownloadSDK({
            userId: 'test-user',
            onProgress: progressSpy
        });

        mockAxios.get.mockImplementation((_url, config) => {
            const range = config?.headers?.Range || 'bytes=0-1023';
            const [start, end] = range.replace('bytes=', '').split('-').map(Number);
            const size = end - start + 1;

            return Promise.resolve({
                data: new ArrayBuffer(size),
                headers: {
                    'content-length': String(size),
                    'content-range': `bytes ${start}-${end}/1024`
                },
                status: 206
            });
        });

        await sdk.download({
            taskId: 'test-task',
            fileUrl: 'test://example.com/test.zip',
            filename: 'test.zip',
            fileSize: 1024
        });

        expect(progressSpy).toHaveBeenCalled();
        const progress = progressSpy.mock.calls[0][0];
        expect(progress).toMatchObject({
            taskId: 'test-task',
            loaded: expect.any(Number),
            total: 1024,
            progress: expect.any(Number)
        });
    });

    it('should handle pause and resume', async () => {
        const taskId = 'test-task';
        
        // 创建任务
        await sdk.download({
            taskId,
            fileUrl: 'http://example.com/test.zip',
            filename: 'test.zip',
            fileSize: 1024 * 1024
        }).catch(() => {}); // 忽略暂停导致的错误

        // 暂停下载
        await sdk.pause(taskId);
        const pausedList = sdk.getDownloadList();
        expect(pausedList[0].status).toBe(FILE_STATUS.PAUSE);

        // 恢复下载
        await sdk.resume(taskId);
        const resumedList = sdk.getDownloadList();
        expect(resumedList[0].status).toBe(FILE_STATUS.UPLOADING);
    });

    it('should handle concurrent downloads', async () => {
        jest.useFakeTimers();

        const downloads = [
            {
                taskId: 'task-1',
                fileUrl: 'test://example.com/1.zip',
                filename: '1.zip',
                fileSize: 1024
            },
            {
                taskId: 'task-2',
                fileUrl: 'test://example.com/2.zip',
                filename: '2.zip',
                fileSize: 1024
            },
            {
                taskId: 'task-3',
                fileUrl: 'test://example.com/3.zip',
                filename: '3.zip',
                fileSize: 1024
            }
        ];

        const downloadPromises = downloads.map(info => sdk.download(info));
        jest.runAllTimers();
        await Promise.all(downloadPromises.map(p => p.catch(() => {})));

        const list = sdk.getDownloadList();
        expect(list).toHaveLength(3);

        jest.useRealTimers();
    });
}); 