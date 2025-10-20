<template>
  <div class="app-layout">
    <Sidebar />
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import Sidebar from '@/components/sidebar/Sidebar.vue'
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  background-color: #f8fafc;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: white;
}

/* Responsive design */
@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }
  
  .main-content {
    height: calc(100vh - 200px); /* Adjust based on sidebar height */
  }
}
</style>

