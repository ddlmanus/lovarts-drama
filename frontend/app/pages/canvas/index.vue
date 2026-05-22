<template>
  <div class="canvas-page-root dark">
    <CanvasHome />
  </div>
</template>

<script setup>
import CanvasHome from '~/canvas/views/Home.vue'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  const projectId = String(route.query.projectId || '').trim()
  if (projectId) {
    router.replace(`/canvas/${encodeURIComponent(projectId)}`)
  }
})
</script>
