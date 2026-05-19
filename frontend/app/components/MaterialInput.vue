<template>
  <section class="material-input-container shadow-sm" aria-label="生成输入">
    <div class="toggle-bar">
      <div class="toggle-handle"></div>
    </div>
    <div class="input-wrapper">
      <div class="upload-row">
        <div class="image-upload-stack">
          <div class="popover-content">
            <div class="image-wrapper image-wrapper-common">
              <button class="upload-image-seat" type="button" @click="toast.info('上传功能即将开放')">
                <svg class="upload-plus-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M12 5.25a.75.75 0 0 1 .75.75v5.25H18a.75.75 0 0 1 0 1.5h-5.25V18a.75.75 0 0 1-1.5 0v-5.25H6a.75.75 0 0 1 0-1.5h5.25V6a.75.75 0 0 1 .75-.75" />
                </svg>
                <span>上传</span>
                <span>0 / 4</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <button class="prompt-polish-button" type="button" aria-label="智能优化提示词" @click="polishPrompt">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M15 19c1.2-3.678 2.526-5.005 6-6c-3.474-.995-4.8-2.322-6-6c-1.2 3.678-2.526 5.005-6 6c3.474.995 4.8 2.322 6 6Zm-8-9c.6-1.84 1.263-2.503 3-3c-1.737-.497-2.4-1.16-3-3c-.6 1.84-1.263 2.503-3 3c1.737.497 2.4 1.16 3 3Zm1.5 10c.3-.92.631-1.251 1.5-1.5c-.869-.249-1.2-.58-1.5-1.5c-.3.92-.631 1.251-1.5 1.5c.869.249 1.2.58 1.5 1.5Z" />
        </svg>
      </button>
      <div class="input-with-mention">
        <div
          ref="promptEditable"
          class="prompt-input-editable"
          contenteditable="true"
          data-placeholder="请输入图片生成的提示词，例如：做一张“情人节”海报"
          @input="handlePromptInput"
        ></div>
      </div>
    </div>
    <div class="footer">
      <div class="action-buttons">
        <button class="model-select-button" type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm1-4h12l-3.75-5l-3 4L9 13z" />
          </svg>
          <span>图片</span>
          <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" />
          </svg>
        </button>
        <button class="model-select-button" type="button">
          <img src="https://ffile.chatfire.site/cf/chatfire-media/icon/dark/google-color.png" alt="" class="model-icon" />
          <span>Nano-Banana-Pro</span>
          <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" />
          </svg>
        </button>
        <button class="illustration-button" type="button" aria-label="风格设置">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 22A10 10 0 0 1 2 12A10 10 0 0 1 12 2c5.5 0 10 4 10 9a6 6 0 0 1-6 6h-1.8c-.3 0-.5.2-.5.5c0 .1.1.2.1.3c.4.5.6 1.1.6 1.7c.1 1.4-1 2.5-2.4 2.5m0-18a8 8 0 0 0-8 8a8 8 0 0 0 8 8c.3 0 .5-.2.5-.5c0-.2-.1-.3-.1-.4c-.4-.5-.6-1-.6-1.6c0-1.4 1.1-2.5 2.5-2.5H16a4 4 0 0 0 4-4c0-3.9-3.6-7-8-7m-5.5 6c.8 0 1.5.7 1.5 1.5S7.3 13 6.5 13S5 12.3 5 11.5S5.7 10 6.5 10m3-4c.8 0 1.5.7 1.5 1.5S10.3 9 9.5 9S8 8.3 8 7.5S8.7 6 9.5 6m5 0c.8 0 1.5.7 1.5 1.5S15.3 9 14.5 9S13 8.3 13 7.5S13.7 6 14.5 6m3 4c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5" />
          </svg>
        </button>
      </div>
      <div class="footer-right">
        <button class="combined-config-button" type="button">
          <span>1:1</span>
          <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" />
          </svg>
        </button>
        <span class="credit-cost-display">
          <svg class="credit-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M11 15H6l7-14v8h5l-7 14z" />
          </svg>
          <span class="credit-text">40</span>
        </span>
        <button class="submit-button" type="button" aria-label="生成" @click="submitPrompt">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 12l-.604-5.437C4.223 5.007 5.825 3.864 7.24 4.535l11.944 5.658c1.525.722 1.525 2.892 0 3.614L7.24 19.466c-1.415.67-3.017-.472-2.844-2.028zm0 0h7" />
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { toast } from 'vue-sonner'

const model = defineModel({ type: String, default: '' })
const promptEditable = ref(null)

function handlePromptInput(event) {
  model.value = event.currentTarget?.textContent || ''
}

function syncPromptEditable() {
  nextTick(() => {
    if (promptEditable.value && promptEditable.value.textContent !== model.value) {
      promptEditable.value.textContent = model.value
    }
  })
}

function polishPrompt() {
  if (!model.value.trim()) {
    toast.info('请先输入提示词')
    return
  }
  model.value = `${model.value.trim()}，画面细节丰富，光影自然，高品质成片。`
  syncPromptEditable()
  toast.success('已优化提示词')
}

function submitPrompt() {
  if (!model.value.trim()) {
    toast.info('请输入提示词')
    return
  }
  toast.success('生成入口已准备，后续可接入图片生成接口')
}

watch(model, syncPromptEditable)
onMounted(syncPromptEditable)
</script>

<style scoped>
.material-input-container {
  position: fixed;
  left: calc(50vw + 95px);
  right: auto;
  bottom: 18px;
  z-index: 10;
  width: min(1118px, calc(100vw - 190px - 320px));
  min-width: 720px;
  max-width: calc(100vw - 190px - 96px);
  margin: 0 auto;
  padding: 0 16px 13px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: #242424;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
  transform: translateX(-50%);
}

.toggle-bar {
  display: flex;
  justify-content: center;
  height: 18px;
  margin-bottom: 0;
  align-items: center;
}

.toggle-handle {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.68);
}

.input-wrapper {
  position: relative;
  min-height: 108px;
  padding-left: 88px;
  border-radius: 10px;
  background: transparent;
}

.upload-row {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 74px;
  height: 100%;
  padding: 0;
}

.image-upload-stack,
.popover-content,
.image-wrapper {
  width: 100%;
  height: 100%;
}

.upload-image-seat {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 88px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #666363;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  color: #8b95a5;
  font: inherit;
  font-size: 10px;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.upload-image-seat:hover {
  border-color: #7c8797;
  transform: scale(1.08);
}

.prompt-polish-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #d4d4d4;
}

.input-with-mention {
  min-height: 108px;
  width: 100%;
}

.prompt-input-editable {
  width: 100%;
  min-height: 108px;
  padding: 18px 42px 12px 16px;
  outline: none;
  color: rgba(255, 255, 255, 0.82);
  font-size: clamp(12px, 0.78vw, 14px);
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt-input-editable:empty::before {
  color: #6b7280;
  content: attr(data-placeholder);
  pointer-events: none;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

.action-buttons,
.footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.model-select-button,
.combined-config-button,
.illustration-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.78);
  font: inherit;
  font-size: 13px;
  white-space: nowrap;
}

.illustration-button {
  width: 34px;
  padding: 0;
  justify-content: center;
}

.model-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.credit-cost-display {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #d9e4f2;
  font-weight: 700;
}

.credit-icon {
  color: #d7a629;
}

.submit-button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: #0a84ff;
  color: #fff;
}

button:hover {
  filter: brightness(1.08);
}

@media (max-width: 1180px) {
  .material-input-container {
    left: calc(50vw + 95px);
    width: calc(100vw - 190px - 64px);
    min-width: 0;
    max-width: 960px;
  }
}

@media (max-width: 860px) {
  .material-input-container {
    padding: 0 12px 10px;
  }

  .input-wrapper {
    min-height: 92px;
    padding-left: 76px;
  }

  .upload-row {
    width: 66px;
  }

  .upload-image-seat {
    min-height: 78px;
  }

  .input-with-mention,
  .prompt-input-editable {
    min-height: 92px;
  }

  .footer {
    align-items: stretch;
    flex-direction: column;
  }

  .action-buttons,
  .footer-right {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .material-input-container {
    left: 18px;
    right: 18px;
    bottom: 12px;
    width: auto;
    min-width: 0;
    max-width: none;
    transform: none;
  }
}

@media (max-width: 560px) {
  .input-wrapper {
    min-height: 150px;
    padding-top: 58px;
    padding-left: 0;
  }

  .upload-row {
    width: 100%;
    height: 50px;
    padding: 0;
  }

  .upload-image-seat {
    min-height: 48px;
  }

  .input-with-mention,
  .prompt-input-editable {
    min-height: 92px;
  }

  .model-select-button:nth-child(2) span:not(.model-icon) {
    max-width: 132px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@media (max-height: 760px) and (min-width: 861px) {
  .material-input-container {
    width: min(980px, calc(100vw - 190px - 96px));
    max-width: 920px;
  }

  .input-wrapper,
  .input-with-mention,
  .prompt-input-editable {
    min-height: 92px;
  }

  .upload-image-seat {
    min-height: 78px;
  }
}
</style>
