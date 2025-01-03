import { VisualDownloadSDK } from '../src';

async function test() {
    const sdk = new VisualDownloadSDK({
        userId: 'test-user',
        onProgress: (progress) => {
            console.log('Download progress:', progress);
        },
        onError: (error) => {
            console.error('Download error:', error);
        }
    });

    try {
        // 开始下载
        await sdk.download({
            taskId: 'test-task',
            fileUrl: 'https://example.com/test.zip',
            filename: 'test.zip',
            fileSize: 1024 * 1024
        });

        // 2秒后暂停
        setTimeout(async () => {
            await sdk.pause('test-task');
            console.log('Download paused');

            // 再过2秒恢复
            setTimeout(async () => {
                await sdk.resume('test-task');
                console.log('Download resumed');
            }, 2000);
        }, 2000);

        // 监听下载列表变化
        sdk.subscribe((list) => {
            console.log('Download list updated:', list);
        });

    } catch (error) {
        console.error('Test failed:', error);
    }
}

test(); 