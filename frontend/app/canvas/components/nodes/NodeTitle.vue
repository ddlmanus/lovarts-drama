<template>
  <div class="node-title">
    <n-icon :size="14">
      <component :is="icon" />
    </n-icon>
    <span
      v-if="!editing"
      class="node-title-text"
      title="双击编辑名称"
      @dblclick="$emit('start-edit')"
    >
      {{ label }}
    </span>
    <input
      v-else
      ref="inputRef"
      :value="modelValue"
      class="node-title-input"
      @input="$emit('update:modelValue', $event.target.value)"
      @blur="$emit('finish-edit')"
      @keydown.enter="$emit('finish-edit')"
      @keydown.escape="$emit('cancel-edit')"
    />
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { NIcon } from 'naive-ui'

const props = defineProps({
  label: { type: String, default: '' },
  icon: { type: [Object, Function], required: true },
  editing: { type: Boolean, default: false },
  modelValue: { type: String, default: '' }
})

defineEmits(['start-edit', 'finish-edit', 'cancel-edit', 'update:modelValue'])

const inputRef = ref(null)

watch(
  () => props.editing,
  (editing) => {
    if (!editing) return
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    })
  }
)
</script>

<style scoped>
.node-title {
  position: absolute;
  left: 2px;
  top: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: calc(100% - 56px);
  height: 20px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1;
}

.node-title-text {
  max-width: 100%;
  padding: 2px 4px;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
  transition: background-color 0.15s ease;
}

.node-title-text:hover {
  background: var(--bg-tertiary);
}

.node-title-input {
  width: 160px;
  max-width: 100%;
  padding: 2px 5px;
  border: 1px solid var(--accent-color);
  border-radius: 4px;
  outline: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}
</style>
