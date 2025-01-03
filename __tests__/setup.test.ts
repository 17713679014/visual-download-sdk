describe('Test Environment', () => {
    it('should have mocked URL API', () => {
        expect(URL.createObjectURL).toBeDefined();
        expect(URL.revokeObjectURL).toBeDefined();
    });

    it('should have mocked Blob', () => {
        const blob = new Blob(['test']);
        expect(blob.size).toBe(4);
    });

    it('should have mocked FileReader', () => {
        const reader = new FileReader();
        expect(reader.readAsArrayBuffer).toBeDefined();
        expect(reader.abort).toBeDefined();
    });
}); 