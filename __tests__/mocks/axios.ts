export const mockAxios = {
    get: jest.fn().mockImplementation((_url, config) => {
        // 模拟成功的响应
        return Promise.resolve({
            data: new ArrayBuffer(1024),
            headers: {
                'content-length': '1024',
                'content-range': config?.headers?.Range 
                    ? `bytes ${config.headers.Range.replace('bytes=', '')}/1024`
                    : undefined
            },
            status: 200,
            statusText: 'OK',
            config,
            request: {}
        });
    }),
    CancelToken: {
        source: jest.fn().mockReturnValue({
            token: 'mock-token',
            cancel: jest.fn().mockImplementation((message) => {
                const error = new Error(message || 'DOWNLOAD_CANCELED');
                (error as any).__CANCEL__ = true;
                throw error;
            })
        })
    },
    isCancel: jest.fn().mockImplementation(error => !!(error && (error as any).__CANCEL__))
};

jest.mock('axios', () => ({
    ...mockAxios,
    default: mockAxios
})); 