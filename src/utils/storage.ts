import { openDB, IDBPDatabase } from 'idb';

export class Storage {
    private db: IDBPDatabase | null = null;
    private dbName: string;
    private storeName: string;
    private initPromise: Promise<void> | null = null;
    private version = 1; // 添加版本控制

    constructor(config: { dbName: string; storeName: string }) {
        this.dbName = config.dbName;
        this.storeName = config.storeName;
    }

    async initialize(): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initialize();
        return this.initPromise;
    }

    private async _initialize(): Promise<void> {
        if (this.db) return;

        console.log(`[Storage] Initializing database: ${this.dbName}, store: ${this.storeName}`);
        const storeName = this.storeName;

        try {
            // 先尝试打开数据库检查版本
            const existingDb = await openDB(this.dbName, undefined, {
                blocked() {
                    console.warn(`[Storage] Database blocked`);
                }
            });

            const currentVersion = existingDb.version;
            existingDb.close();

            // 如果 store 不存在，增加版本号重新打开数据库
            if (!existingDb.objectStoreNames.contains(storeName)) {
                console.log(`[Storage] Store not found, upgrading database`);
                this.version = currentVersion + 1;
            }

            // 打开或升级数据库
            this.db = await openDB(this.dbName, this.version, {
                upgrade(db, oldVersion, newVersion) {
                    console.log(`[Storage] Upgrading database from version ${oldVersion} to ${newVersion}`);
                    
                    if (!db.objectStoreNames.contains(storeName)) {
                        console.log(`[Storage] Creating object store: ${storeName}`);
                        db.createObjectStore(storeName);
                    }
                },
                blocked() {
                    console.warn(`[Storage] Database blocked during upgrade`);
                },
                blocking() {
                    console.warn(`[Storage] Database blocking other connections`);
                },
                terminated() {
                    console.error(`[Storage] Database connection terminated`);
                }
            });

            console.log(`[Storage] Database initialized successfully`);
            
            // 验证 store 是否可用
            const transaction = this.db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            await transaction.done; // 等待事务完成
            console.log(`[Storage] Object store verified: ${store.name}`);
            
        } catch (error) {
            console.error(`[Storage] Failed to initialize database:`, error);
            this.initPromise = null;
            throw error;
        }
    }

    async get<T>(key: string): Promise<T | undefined> {
        await this.initialize();
        if (!this.db) throw new Error('Database not initialized');
        
        try {
            console.log(`[Storage] Getting key: ${key}`);
            return await this.db.get(this.storeName, key);
        } catch (error) {
            console.error(`[Storage] Error getting key ${key}:`, error);
            if (error instanceof Error && error.name === 'NotFoundError') {
                return undefined;
            }
            throw error;
        }
    }

    async set<T>(key: string, value: T): Promise<void> {
        await this.initialize();
        if (!this.db) throw new Error('Database not initialized');

        try {
            console.log(`[Storage] Setting key: ${key}`);
            await this.db.put(this.storeName, value, key);
        } catch (error) {
            console.error(`[Storage] Error setting key ${key}:`, error);
            throw error;
        }
    }

    async delete(key: string): Promise<void> {
        await this.initialize();
        if (!this.db) throw new Error('Database not initialized');

        try {
            console.log(`[Storage] Deleting key: ${key}`);
            await this.db.delete(this.storeName, key);
        } catch (error) {
            console.error(`[Storage] Error deleting key ${key}:`, error);
            throw error;
        }
    }

    async deleteStore(): Promise<void> {
        try {
            // 先关闭当前连接
            if (this.db) {
                this.db.close();
                this.db = null;
            }

            // 获取当前版本
            const existingDb = await openDB(this.dbName, undefined);
            const currentVersion = existingDb.version;
            existingDb.close();

            const storeName = this.storeName;
            
            // 升级数据库并删除 store
            const db = await openDB(this.dbName, currentVersion + 1, {
                upgrade(db) {
                    if (db.objectStoreNames.contains(storeName)) {
                        console.log(`[Storage] Deleting store: ${storeName}`);
                        db.deleteObjectStore(storeName);
                    }
                },
                blocked() {
                    console.warn(`[Storage] Database blocked during store deletion`);
                }
            });

            db.close();
            console.log(`[Storage] Store deleted: ${this.storeName}`);
            
            // 重置初始化状态
            this.initPromise = null;
            
        } catch (error) {
            console.error(`[Storage] Error deleting store:`, error);
            throw error;
        }
    }

    async clear(): Promise<void> {
        await this.initialize();
        if (!this.db) throw new Error('Database not initialized');

        try {
            console.log(`[Storage] Clearing store: ${this.storeName}`);
            await this.db.clear(this.storeName);
        } catch (error) {
            // 如果 store 不存在，忽略错误
            if (error instanceof Error && error.name === 'NotFoundError') {
                console.log(`[Storage] Store not found: ${this.storeName}`);
                return;
            }
            console.error(`[Storage] Error clearing store:`, error);
            throw error;
        }
    }

    async close(): Promise<void> {
        if (this.db) {
            console.log(`[Storage] Closing database`);
            this.db.close();
            this.db = null;
            this.initPromise = null;
        }
    }
} 