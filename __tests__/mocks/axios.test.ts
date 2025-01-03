import { mockAxios } from './axios';

describe('Axios Mock', () => {
    it('should mock axios get method', async () => {
        const response = await mockAxios.get();
        expect(response.data).toBeInstanceOf(ArrayBuffer);
        expect(response.status).toBe(200);
    });

    it('should handle cancel token', () => {
        const source = mockAxios.CancelToken.source();
        expect(source.token).toBe('mock-token');
        expect(() => source.cancel('test')).toThrow();
    });

    it('should detect canceled requests', () => {
        const error = { __CANCEL__: true };
        expect(mockAxios.isCancel(error)).toBe(true);
    });
}); 