<script setup>
import { X } from 'lucide-vue-next'

defineProps({
  title: {
    type: String,
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  wide: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div
      class="modal"
      :class="{ 'modal--wide': wide }"
      role="dialog"
      aria-modal="true"
      :aria-label="label || title"
    >
      <div class="modal__head">
        <h3 class="modal__title">{{ title }}</h3>
        <button
          class="icon-btn modal__close"
          type="button"
          :aria-label="`关闭${label || title}`"
          @click="emit('close')"
        >
          <X :size="15" />
        </button>
      </div>

      <slot />

      <div v-if="$slots.footer" class="modal__foot">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
