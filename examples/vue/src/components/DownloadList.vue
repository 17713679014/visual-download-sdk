<template>
  <div class="list-container">
    <div class="header">
      <h2>下载管理器示例</h2>
      <div class="controls">
        <button class="add-btn" @click="triggerFileInput">选择文件</button>
        <input
          type="file"
          ref="fileInput"
          @change="handleFileSelect"
          multiple
          style="display: none"
        />
        <button v-if="downloadList.length > 0" @click="clearAll">清空列表</button>
      </div>
    </div>

    <ul class="container" id="fileList">
      <li v-for="item in downloadList" 
          :key="item.taskId" 
          :class="{ [getStatusClass(item.status)]: true, 'file-list': true }">
        <!-- 文件信息容器 -->
        <div class="info">
          <div class="file-name">
            <div class="file-icon">
              <img :src="getFileIcon(item.filename)">
            </div>
            <div class="file-progress">
              <!-- 文件名 -->
              <div :title="item.filename" 
                   class="name-text" 
                   :class="{ 'no-progress': item.status !== FILE_STATUS.UPLOADING && item.status !== FILE_STATUS.PAUSE }">
                {{ item.filename }}
              </div>
              <!-- 进度条背景 -->
              <div v-show="item.status === FILE_STATUS.UPLOADING || item.status === FILE_STATUS.PAUSE" 
                   class="progress-all progress-common">
              </div>
              <!-- 实时进度条 -->
              <div v-show="item.status === FILE_STATUS.UPLOADING || item.status === FILE_STATUS.PAUSE"
                   :style="`width: ${item.progress}%`"
                   class="progress-now progress-common">
                <div v-show="item.status === FILE_STATUS.UPLOADING" 
                     class="animation">
                </div>
              </div>
              <!-- 状态信息 -->
              <div class="status" 
                   :class="{ 'no-progress': item.status !== FILE_STATUS.UPLOADING && item.status !== FILE_STATUS.PAUSE }">
                <span class="file-status">
                  <span v-if="item.status === FILE_STATUS.ERROR && item.error" 
                        class="error" 
                        @click="handleOperate(item, 'retry')">
                    {{ item.error }}
                  </span>
                </span>
                <!-- 文件大小 -->
                <div class="file-size">{{ formatSize(item.total) }}</div>
                <!-- 下载速度和剩余时间 -->
                <div v-if="item.status === FILE_STATUS.UPLOADING" 
                     class="download-info">
                  <span v-html="speedIcon" class="icon"></span>
                  <span class="speed">{{ item.speed === '0' ? '-' : item.speed }}</span>
                  <span class="estimated-time">
                    <template v-if="getEstimatedTime(item)">
                      约{{ getEstimatedTime(item) }}
                    </template>
                    <template v-else>
                      计算中...
                    </template>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <!-- 文件操作按钮 -->
          <div class="file-operate">
            <!-- 暂停 -->
            <span v-if="item.status === FILE_STATUS.UPLOADING"
                  title="暂停"
                  class="common-icon-container"
                  @click="handleOperate(item, 'pause')">
              <span v-html="iconPauseDownload" class="icon"></span>
            </span>
            <!-- 排队中 -->
            <span v-if="item.status === FILE_STATUS.WAITING"
                  title="排队中"
                  class="common-icon-container">
              <span v-html="iconWaiting" class="icon"></span>
            </span>
            <!-- 继续 -->
            <span v-if="item.status === FILE_STATUS.PAUSE"
                  title="继续"
                  class="common-icon-container"
                  @click="handleOperate(item, 'continue')">
              <span v-html="iconContinueDownload" class="icon"></span>
            </span>
            <!-- 重试 -->
            <span v-if="item.status === FILE_STATUS.ERROR"
                  title="重试"
                  class="common-icon-container"
                  @click="handleOperate(item, 'retry')">
              <span v-html="iconRetryDownload" class="icon"></span>
            </span>
            <!-- 另存为 -->
            <span v-if="item.status === FILE_STATUS.SUCCESS"
                  title="另存为"
                  class="common-icon-container"
                  @click="handleOperate(item, 'save')">
              <span v-html="iconSave" class="icon"></span>
            </span>
            <!-- 删除 -->
            <span v-if="item.status !== FILE_STATUS.WAITING"
                  title="删除"
                  class="common-icon-container"
                  @click="handleOperate(item, 'remove')">
              <span v-html="iconDelete" class="icon"></span>
            </span>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="downloadList.length === 0" class="empty-tip">
      暂无下载任务，点击"添加测试下载"开始测试
    </div>
    
    <span v-else class="always-tip">- 文件保存时间有限，请及时下载 -</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { VisualDownloadSDK } from 'xjt870-file-downloader';
import type { TaskMetadata } from 'xjt870-file-downloader';
import { FILE_STATUS } from 'xjt870-file-downloader';

// 导入图标资源
const iconSave = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
</svg>`;

const iconDelete = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
</svg>`;

const iconContinueDownload = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
  <path d="M8 5v14l11-7z"/>
</svg>`;

const iconPauseDownload = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
</svg>`;

const iconRetryDownload = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
</svg>`;

const iconWaiting = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
  <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
</svg>`;

const speedIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
  <path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44z"/>
  <path d="M10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"/>
</svg>`;

import iconFile from '@/assets/images/main/download/icon-file.png';
import iconPdf from '@/assets/images/main/download/icon-pdf.png';
import iconDoc from '@/assets/images/main/download/icon-doc.png';
import iconExcel from '@/assets/images/main/download/icon-excel.png';
import iconZip from '@/assets/images/main/download/icon-zip.png';

export default defineComponent({
  name: 'DownloadList',
  setup() {
    const downloadList = ref<TaskMetadata[]>([]);
    const sdk = new VisualDownloadSDK({
      userId: 'test-user',
      maxConcurrentDownloads: 3,
      onProgress: () => {
        downloadList.value = sdk.getDownloadList();
      },
      onError: (error) => {
        console.error('Download error:', error);
      }
    });

    const handleOperate = async (item: TaskMetadata, type: string) => {
      switch (type) {
        case 'pause':
          await sdk.pause(item.taskId);
          break;
        case 'continue':
          await sdk.resume(item.taskId);
          break;
        case 'retry':
          await sdk.retry(item.taskId);
          break;
        case 'remove':
          await sdk.remove(item.taskId);
          break;
        default:
          console.error('Unknown operation type:', type);
      }
    };

    const getStatusClass = (status: string): string => {
      return `status-${status.toLowerCase()}`;
    };

    const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    };

    const getEstimatedTime = (item: TaskMetadata): string => {
      if (!item.speed || item.speed === '0 B/s') return '';
      const speed = parseFloat(item.speed);
      const remaining = item.total - item.loaded;
      const seconds = remaining / speed;
      if (seconds < 60) return `${Math.ceil(seconds)}秒`;
      return `${Math.ceil(seconds / 60)}分钟`;
    };

    const getFileIcon = (filename: string): string => {
      const fileType = filename.split('.').pop()?.toLowerCase();
      // 根据文件类型返回不同图标
      switch (fileType) {
        case 'pdf':
          return iconPdf;
        case 'doc':
        case 'docx':
          return iconDoc;
        case 'xls':
        case 'xlsx':
          return iconExcel;
        case 'zip':
        case 'rar':
          return iconZip;
        default:
          return iconFile; // 默认文件图标
      }
    };

    let unsubscribe: (() => void) | null = null;

    onMounted(() => {
      unsubscribe = sdk.subscribe((list) => {
        downloadList.value = list;
      });
    });

    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe();
      }
      sdk.destroy();
    });

    const fileInput = ref<HTMLInputElement | null>(null);
    
    const triggerFileInput = () => {
      fileInput.value?.click();
    };

    const handleFileSelect = async (event: Event) => {
      const input = event.target as HTMLInputElement;
      const files = input.files;
      if (!files) return;

      for (const file of files) {
        const taskId = `task-${Date.now()}-${file.name}`;
        await sdk.download({
          taskId,
          filename: file.name,
          fileUrl: URL.createObjectURL(file),
          fileSize: file.size
        });
      }
      
      // 清空 input，以便重复选择同一文件
      input.value = '';
    };

    const clearAll = async () => {
      const tasks = sdk.getDownloadList();
      for (const task of tasks) {
        await sdk.remove(task.taskId);
      }
    };

    return {
      downloadList,
      handleOperate,
      getStatusClass,
      formatSize,
      getEstimatedTime,
      getFileIcon,
      FILE_STATUS,
      // 图标
      iconSave,
      iconDelete,
      iconContinueDownload,
      iconPauseDownload,
      iconRetryDownload,
      iconWaiting,
      speedIcon,
      fileInput,
      triggerFileInput,
      handleFileSelect,
      clearAll
    };
  }
});
</script>

<style lang="scss" scoped>
@use "sass:color";
@use '../styles/index.scss' as *;

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 16px;

  h2 {
    margin: 0;
    font-size: 18px;
    color: #333;
  }
}

.controls {
  display: flex;
  gap: 12px;

  button {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 14px;

    &.add-btn {
      background-color: #5564FF;
      color: white;

      &:hover {
        background-color: color.adjust(#5564FF, $lightness: -10%);
      }
    }

    &:not(.add-btn) {
      background-color: #f5f5f5;
      color: #666;

      &:hover {
        background-color: color.adjust(#f5f5f5, $lightness: -5%);
      }
    }
  }
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: #666;

  &:hover {
    color: #333;
  }

  svg {
    width: 100%;
    height: 100%;
  }
}
</style> 