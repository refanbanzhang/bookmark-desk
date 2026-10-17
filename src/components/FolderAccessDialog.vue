<script setup>
import { computed, ref, watch } from 'vue'
import { LockKeyhole } from 'lucide-vue-next'
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

const isUnlock = computed(() => accessMode.value === 'unlock')
const isRemove = computed(() => accessMode.value === 'remove')
const isChange = computed(() => accessMode.value === 'change')
const title = computed(() => {
  if (isUnlock.value) return '输入目录密码'
  if (isRemove.value) return '移除目录密码'
  return isChange.value ? '修改目录密码' : '设置目录密码'
})
const actionLabel = computed(() => (isUnlock.value ? '解锁' : isRemove.value ? '移除' : '保存'))

const reset = () => {
  password.value = ''
  nextPassword.value = ''
  confirmPassword.value = ''
}

watch(accessDialog, reset)

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
      {{ accessNode?.title || '未命名目录' }}
    </p>

    <label v-if="isUnlock || isRemove || isChange" class="field">
      <span class="field__label">{{ isUnlock || isRemove ? '访问密码' : isChange ? '当前密码' : '密码' }}</span>
      <input
        v-model="password"
        class="field__input"
        type="password"
        autocomplete="off"
        @keydown.enter.prevent="onSubmit"
      />
    </label>

    <template v-if="!isUnlock && !isRemove">
      <label class="field">
        <span class="field__label">新密码</span>
        <input v-model="nextPassword" class="field__input" type="password" autocomplete="new-password" />
      </label>
      <label class="field">
        <span class="field__label">确认新密码</span>
        <input v-model="confirmPassword" class="field__input" type="password" autocomplete="new-password" />
        <em v-if="confirmPassword && nextPassword !== confirmPassword" class="field__error">
          两次输入的密码不一致。
        </em>
      </label>
    </template>

    <em v-if="accessError" class="field__error">{{ accessError }}</em>

    <template #footer>
      <button class="btn btn--ghost" type="button" @click="closeDialog">取消</button>
      <button class="btn" :class="isRemove ? 'btn--danger' : 'btn--primary'" type="button" @click="onSubmit">
        {{ actionLabel }}
      </button>
    </template>
  </BaseModal>
</template>
