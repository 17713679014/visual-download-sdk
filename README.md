# File Downloader SDK

文件下载SDK，支持断点续传、进度跟踪和状态管理。

## 安装

```bash
npm install xjt870-file-downloader
# 或者
yarn add xjt870-file-downloader
# 或者
pnpm add xjt870-file-downloader
```

## 使用

```typescript
import { VisualDownloadSDK } from 'xjt870-file-downloader';

const sdk = new VisualDownloadSDK({
    userId: 'user123',
    maxConcurrentDownloads: 3,
    onProgress: (progress) => {
        console.log('Download progress:', progress);
    }
});

// 开始下载
await sdk.download({
    taskId: 'file123',
    filename: 'example.pdf',
    fileUrl: 'https://example.com/file.pdf',
    fileSize: 1024 * 1024
});
```

## 特性

- 📦 文件分片下载
- 🔄 断点续传
- 📊 进度跟踪
- 💾 本地存储
- 🔄 状态管理
- 🎯 并发控制

## 快速开始

```typescript
import VisualDownloadSDK from '@baidu/visual-download-sdk';

// 初始化SDK
const sdk = new VisualDownloadSDK({
    userId: 'user123',
    maxConcurrentDownloads: 3
});

// 创建下载任务
const taskId = await sdk.download({
    taskId: 'file123',
    fileUrl: 'https://example.com/file.zip',
    filename: 'file.zip',
    fileSize: 1024 * 1024 * 10 // 10MB
});

// 监听下载状态
sdk.subscribe((downloadList) => {
    console.log('Download status updated:', downloadList);
});

// 暂停下载
await sdk.pause(taskId);

// 恢复下载
await sdk.resume(taskId);

// 删除任务
await sdk.remove(taskId);
```

## API文档

### VisualDownloadSDK

#### 构造函数

```typescript
constructor(config: SDKConfig)
```

配置参数:

- `userId: string` - 用户标识
- `chunkSize?: number` - 分片大小(默认1MB)
- `maxConcurrentDownloads?: number` - 最大并发下载数(默认3)
- `onError?: (error: Error) => void` - 错误处理回调
- `onProgress?: (progress: TaskProgress) => void` - 进度更新回调

#### 方法

##### download(fileInfo: DownloadFile): Promise<string>

创建下载任务

##### pause(taskId: string): Promise<void>

暂停指定任务

##### resume(taskId: string): Promise<void>

恢复指定任务

##### remove(taskId: string): Promise<void>

删除指定任务

##### getDownloadList(): TaskMetadata[]

获取下载列表

##### subscribe(listener: (list: TaskMetadata[]) => void): () => void

订阅下载状态变化

##### initialize(): Promise<void>

初始化SDK

##### destroy(): Promise<void>

销毁SDK实例

### 类型定义

```typescript
interface DownloadFile {
    taskId: string;
    fileUrl: string;
    filename: string;
    fileSize: number;
    chunkSize?: number;
    dlinkParams?: any;
}

interface TaskMetadata {
    taskId: string;
    filename: string;
    fileLength: number;
    status: string;
    progress: number;
    speed: string;
    error?: string;
}

interface TaskProgress {
    taskId: string;
    loaded: number;
    total: number;
    speed: string;
    progress: number;
}
```

## 示例

### 基础用法

```typescript
// 初始化SDK
const sdk = new VisualDownloadSDK({
    userId: 'user123'
});

// 创建下载任务
const taskId = await sdk.download({
    taskId: 'file123',
    fileUrl: 'https://example.com/file.zip',
    filename: 'file.zip',
    fileSize: 1024 * 1024 * 10
});

// 监听进度
sdk.subscribe((list) => {
    const task = list.find(t => t.taskId === taskId);
    if (task) {
        console.log(`Download progress: ${task.progress}%`);
    }
});
```

### 错误处理

```typescript
const sdk = new VisualDownloadSDK({
    userId: 'user123',
    onError: (error) => {
        console.error('Download error:', error);
    }
});
```
