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
                  <img class="speed-icon" :src="speedIcon">
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
              <img :src="iconPauseDownload" alt="">
            </span>
            <!-- 排队中 -->
            <span v-if="item.status === FILE_STATUS.WAITING"
                  title="排队中"
                  class="common-icon-container">
              <img :src="iconWaiting" alt="">
            </span>
            <!-- 继续 -->
            <span v-if="item.status === FILE_STATUS.PAUSE"
                  title="继续"
                  class="common-icon-container"
                  @click="handleOperate(item, 'continue')">
              <img :src="iconContinueDownload" alt="">
            </span>
            <!-- 重试 -->
            <span v-if="item.status === FILE_STATUS.ERROR"
                  title="重试"
                  class="common-icon-container"
                  @click="handleOperate(item, 'retry')">
              <img :src="iconRetryDownload" alt="">
            </span>
            <!-- 另存为 -->
            <span v-if="item.status === FILE_STATUS.SUCCESS"
                  title="另存为"
                  class="common-icon-container"
                  @click="handleOperate(item, 'save')">
              <img :src="iconSave" alt="">
            </span>
            <!-- 删除 -->
            <span v-if="item.status !== FILE_STATUS.WAITING"
                  title="删除"
                  class="common-icon-container"
                  @click="handleOperate(item, 'remove')">
              <img :src="iconDelete" alt="">
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
import iconSave from '@/assets/images/main/download/icon-save.png';
import iconDelete from '@/assets/images/main/download/icon-delete.png';
import iconContinueDownload from '@/assets/images/main/download/icon-continue.png';
import iconPauseDownload from '@/assets/images/main/download/icon-pause.png';
import iconRetryDownload from '@/assets/images/main/download/icon-retry.png';
import iconWaiting from '@/assets/images/main/download/icon-waiting.png';
import speedIcon from '@/assets/images/main/download/speed-icon.png';
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
</style> 