import { aiModelAPI } from '~/composables/useApi'

const imageModels = ref([])
const videoModels = ref([])
const loaded = ref(false)
const loading = ref(false)
const error = ref(null)
let loadingPromise = null

async function loadModelCatalog(force = false) {
  if (loadingPromise && !force) return loadingPromise
  if (loaded.value && !force) return { imageModels: imageModels.value, videoModels: videoModels.value }

  loading.value = true
  error.value = null
  loadingPromise = Promise.all([
    aiModelAPI.options('image'),
    aiModelAPI.options('video'),
  ])
    .then(([images, videos]) => {
      imageModels.value = Array.isArray(images) ? images : []
      videoModels.value = Array.isArray(videos) ? videos : []
      loaded.value = true
      return { imageModels: imageModels.value, videoModels: videoModels.value }
    })
    .catch((err) => {
      error.value = err
      loaded.value = false
      throw err
    })
    .finally(() => {
      loading.value = false
      loadingPromise = null
    })

  return loadingPromise
}

function resetModelCatalog() {
  imageModels.value = []
  videoModels.value = []
  loaded.value = false
  error.value = null
  loadingPromise = null
}

export function useModelCatalog() {
  return {
    imageModels,
    videoModels,
    loaded,
    loading,
    error,
    loadModelCatalog,
    resetModelCatalog,
  }
}
