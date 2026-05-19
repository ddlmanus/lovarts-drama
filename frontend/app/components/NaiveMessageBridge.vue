<template>
  <span class="hidden" aria-hidden="true"></span>
</template>

<script setup>
import { useMessage } from 'naive-ui'

const message = useMessage()

onMounted(() => {
  window.$message = message
})
</script>
