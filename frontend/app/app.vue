<template>
  <NConfigProvider :theme="darkTheme" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <NaiveMessageBridge />
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
        <Toaster position="top-right" :duration="3000" />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup>
import { NConfigProvider, NDialogProvider, NMessageProvider, darkTheme } from 'naive-ui'
import { Toaster } from 'vue-sonner'

const themeOverrides = {
  common: {
    borderRadius: '12px',
    borderRadiusSmall: '8px',
  },
  Dialog: {
    borderRadius: '16px',
    padding: '24px',
  },
  Modal: {
    borderRadius: '16px',
    padding: '24px',
  },
  Card: {
    borderRadius: '16px',
    padding: '24px',
  },
  Button: {
    borderRadiusMedium: '10px',
    borderRadiusSmall: '8px',
    borderRadiusLarge: '12px',
    heightMedium: '36px',
    paddingMedium: '0 16px',
  },
  Input: {
    borderRadius: '10px',
    heightMedium: '36px',
  },
}
</script>
