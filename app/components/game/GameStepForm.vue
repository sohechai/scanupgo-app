<script setup lang="ts">
const props = defineProps<{
  game: any
  primaryColor: string
  textColor: string
}>()

const emit = defineEmits<{
  submit: [data: { first_name: string; email: string; phone: string; email_opt_in: boolean; sms_opt_in: boolean }]
  back: []
}>()

const form = reactive({
  first_name: '',
  email: '',
  phone: '',
  email_opt_in: false,
  sms_opt_in: false
})

const canSubmit = computed(() => form.first_name.length > 1 && (form.email.length > 5 || form.phone.length > 8))

const handleSubmit = () => {
  if (!canSubmit.value) return
  emit('submit', { ...form })
}

const buttonTextColor = computed(() => {
  const hexColor = props.primaryColor || '#1a1a1a'
  const hex = hexColor.replace('#', '')
  if (hex.length !== 6) return '#ffffff'
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return (yiq >= 128) ? '#111111' : '#ffffff'
})
</script>

<template>
  <div class="w-full max-w-md mx-auto relative z-10 animate-fade-in-up">
    <div class="bg-[#333333] rounded-[32px] p-8 shadow-2xl relative w-full text-center flex flex-col items-center">
      
      <div class="mb-6">
        <h2 class="text-2xl font-black text-white leading-tight">{{ $t('play.form.heading') }}</h2>
        <p class="text-[15px] font-bold text-white mt-2">{{ $t('play.form.subtitle') }}</p>
      </div>

      <form @submit.prevent="handleSubmit" class="w-full space-y-4 text-left rtl:text-right">
        
        <input v-model="form.first_name" type="text"
          class="w-full bg-[#262626] border border-[#444] rounded-xl px-4 py-3.5 text-white font-bold placeholder-gray-400 focus:outline-none focus:border-white transition"
          :placeholder="$t('play.form.first_name_placeholder')">

        <input v-model="form.email" type="email"
          class="w-full bg-[#262626] border border-[#444] rounded-xl px-4 py-3.5 text-white font-bold placeholder-gray-400 focus:outline-none focus:border-white transition"
          :placeholder="$t('play.form.email_placeholder')">

        <input v-model="form.phone" type="tel"
          class="w-full bg-[#262626] border border-[#444] rounded-xl px-4 py-3.5 text-white font-bold placeholder-gray-400 focus:outline-none focus:border-white transition"
          :placeholder="$t('play.form.phone_placeholder')">

        <div class="pt-2">
          <label class="flex items-start gap-3 cursor-pointer group">
            <div class="relative flex items-center mt-0.5 shrink-0">
              <input v-model="form.email_opt_in" type="checkbox" class="peer sr-only">
              <div class="w-5 h-5 border border-[#666] rounded bg-transparent peer-checked:border-white peer-checked:bg-white/10 transition group-hover:border-[#888]"></div>
              <Icon name="ph:check-bold" size="14" class="absolute left-0.5 top-0.5 opacity-0 peer-checked:opacity-100 transition text-white" />
            </div>
            <span class="text-[13px] font-bold text-white leading-tight">
              {{ $t('play.form.email_optin') }}
            </span>
          </label>
        </div>

        <button type="submit" :disabled="!canSubmit"
          class="w-full py-4 mt-6 rounded-[20px] font-black text-[18px] flex items-center justify-center shadow-lg active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          :style="{ backgroundColor: props.primaryColor || '#d63d4a', color: buttonTextColor }">
          {{ $t('play.form.submit') }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
