<template>
  <!-- App Header | 应用头部 -->
  <header
    class="flex items-center justify-between border-b border-[var(--border-color)]"
    :class="compact ? 'h-10 px-3 md:px-4 py-0 text-sm' : 'px-4 md:px-8 py-4'"
  >
    <!-- Left slot | 左侧插槽 -->
    <div class="flex items-center" :class="compact ? 'gap-1.5' : 'gap-2'">
      <slot name="left">
        <!-- Default: empty or logo -->
      </slot>
    </div>
    
    <!-- Right section | 右侧区域 -->
    <div class="flex items-center" :class="compact ? 'gap-2' : 'gap-4'">
      <!-- Center slot | 中间插槽 -->
      <slot name="center"></slot>
      
      <!-- GitHub link | GitHub 链接 -->
      <a 
        v-if="showGithub"
        :href="githubUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)] hover:text-[var(--accent-color)]"
        :class="compact ? 'p-1' : 'p-2'"
        title="GitHub"
      >
        <n-icon :size="compact ? 16 : 20"><LogoGithub /></n-icon>
      </a>
      
      <!-- Theme toggle | 主题切换 -->
      <button 
        v-if="showThemeToggle"
        @click="toggleTheme"
        class="rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
        :class="compact ? 'p-1' : 'p-2'"
      >
        <n-icon :size="compact ? 16 : 20">
          <SunnyOutline v-if="isDark" />
          <MoonOutline v-else />
        </n-icon>
      </button>
      
      <!-- Right slot | 右侧插槽 -->
      <slot name="right"></slot>
    </div>
  </header>
</template>

<script setup>
/**
 * App Header component | 应用头部组件
 * Reusable header with slots for customization
 */
import { NIcon } from 'naive-ui'
import { 
  SunnyOutline, 
  MoonOutline,
  LogoGithub
} from '@vicons/ionicons5'
import { isDark, toggleTheme } from '../stores/theme'

// Props | 属性
defineProps({
  githubUrl: {
    type: String,
    default: 'https://github.com/chatfire-AI/huobao-canvas'
  },
  compact: {
    type: Boolean,
    default: false
  },
  showGithub: {
    type: Boolean,
    default: true
  },
  showThemeToggle: {
    type: Boolean,
    default: true
  }
})
</script>
