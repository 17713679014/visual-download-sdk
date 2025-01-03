class MockXMLHttpRequest {
    private listeners: Record<string, Function[]> = {};
    public readyState = 0;
    public response: any = null;
    public responseText = '';
    public status = 0;
    public statusText = '';
    public upload = {
        addEventListener: jest.fn()
    };
    private aborted = false;

    open(method: string, url: string) {
        this.readyState = 1;
        this.trigger('readystatechange');
    }

    send(data: any) {
        if (this.aborted) return;

        setTimeout(() => {
            if (!this.aborted) {
                this.readyState = 4;
                this.status = 200;
                this.response = new ArrayBuffer(1024);
                this.trigger('readystatechange');
                this.trigger('load');
            }
        }, 0);
    }

    abort() {
        this.aborted = true;
        this.readyState = 0;
        this.status = 0;
        this.trigger('abort');
    }

    addEventListener(type: string, listener: Function) {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(listener);
    }

    removeEventListener(type: string, listener: Function) {
        if (this.listeners[type]) {
            this.listeners[type] = this.listeners[type].filter(l => l !== listener);
        }
    }

    private trigger(type: string) {
        const listeners = this.listeners[type] || [];
        const event = { type };
        listeners.forEach(listener => listener.call(this, event));
    }

    setRequestHeader() {}
    getAllResponseHeaders() { return ''; }
    getResponseHeader(name: string) { 
        if (name.toLowerCase() === 'content-length') {
            return '1024';
        }
        return null;
    }
}

(global as any).XMLHttpRequest = MockXMLHttpRequest; 