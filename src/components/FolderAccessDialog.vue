<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { LockKeyhole } from 'lucide-vue-next'
import { t, text } from '../i18n'
import BaseModal from './BaseModal.vue'
import { useFolderAccess } from '../composables/useFolderAccess'

const {
  accessDialog,
  accessError,
  accessMode,
  accessNode,
  closeDialog,
  submit
} = useFolderAccess()

const password = ref('')
const nextPassword = ref('')
const confirmPassword = ref('')
const passwordInput = ref(null)
const nextPasswordInput = ref(null)

const isUnlock = computed(() => accessMode.value === 'unlock')
const isRemove = computed(() => accessMode.value === 'remove')
const isChange = computed(() => accessMode.value === 'change')
const title = computed(() => {
  if (isUnlock.value) return t('access.titleUnlock')
  if (isRemove.value) return t('access.titleRemove')
  return isChange.value ? t('access.titleChange') : t('access.titleSet')
})
const actionLabel = computed(() => (isUnlock.value ? t('access.unlock') : isRemove.value ? t('access.remove') : t('action.save')))
const passwordLabel = computed(() => {
  if (isUnlock.value || isRemove.value) return t('access.password')
  if (isChange.value) return t('access.current')
  return t('access.password')
})

const reset = () => {
  password.value = ''
  nextPassword.value = ''
  confirmPassword.value = ''
}

watch(
  () => accessDialog.value.mode,
  async (mode) => {
    reset()
    if (!mode) return

    await nextTick()
    const input = isUnlock.value || isRemove.value || isChange.value
      ? passwordInput.value
      : nextPasswordInput.value
    input?.focus()
  },
  { immediate: true }
)

const onSubmit = () => {
  if (!isUnlock.value && !isRemove.value && nextPassword.value !== confirmPassword.value) {
    return
  }
  void submit({ password: password.value, nextPassword: nextPassword.value })
}
</script>

<template>
  <BaseModal
    v-if="accessDialog.mode"
    :title="title"
    :label="title"
    @close="closeDialog"
  >
    <p class="modal__desc">
      <LockKeyhole :size="14" />
      {{ accessNode?.title || t('name.folder') }}
    </p>

    <label v-if="isUnlock || isRemove || isChange" class="field">
      <span class="field__label">{{ passwordLabel }}</span>
      <input
        ref="passwordInput"
        v-model="password"
        class="field__input"
        type="password"
        autocomplete="off"
        @keydown.enter.prevent="onSubmit"
      />
    </label>

    <template v-if="!isUnlock && !isRemove">
      <label class="field">
        <span class="field__label">{{ t('access.new') }}</span>
        <input
          ref="nextPasswordInput"
          v-model="nextPassword"
          class="field__input"
          type="password"
          autocomplete="new-password"
        />
      </label>
      <label class="field">
        <span class="field__label">{{ t('access.confirm') }}</span>
        <input v-model="confirmPassword" class="field__input" type="password" autocomplete="new-password" />
        <em v-if="confirmPassword && nextPassword !== confirmPassword" class="field__error">
          {{ t('access.mismatch') }}
        </em>
      </label>
    </template>

    <em v-if="accessError" class="field__error">{{ text(accessError) }}</em>

    <template #footer>
      <button class="btn btn--ghost" type="button" @click="closeDialog">{{ t('action.cancel') }}</button>
      <button class="btn" :class="isRemove ? 'btn--danger' : 'btn--primary'" type="button" @click="onSubmit">
        {{ actionLabel }}
      </button>
    </template>
  </BaseModal>
</template>
