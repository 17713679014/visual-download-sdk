<template>
  <div class="app">
    <h1>下载管理器示例</h1>
    <DownloadList />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import DownloadList from './components/DownloadList.vue';

export default defineComponent({
  name: 'App',
  components: {
    DownloadList
  }
});
</script>

<style>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}
</style> 