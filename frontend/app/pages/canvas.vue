<template>
  <div class="canvas-page-root dark">
    <CanvasView />
  </div>
</template>

<script setup>
import CanvasView from '~/canvas/views/Canvas.vue'

definePageMeta({
  layout: false,
})
</script>
