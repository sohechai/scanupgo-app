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
</script>

<template>
  <div class="w-full space-y-6 animate-fade-in-up">
    <div class="text-center mb-4">
      <h2 class="text-2xl font-bold">{{ $t('play.form.heading') }}</h2>
      <p class="text-sm opacity-80">{{ $t('play.form.subtitle') }}</p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4 text-left rtl:text-right">
      <input v-model="form.first_name" type="text"
        class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:bg-white/20 focus:outline-none focus:border-white/50 transition"
        :style="{ color: textColor }" :placeholder="$t('play.form.first_name_placeholder')">

      <input v-model="form.email" type="email"
        class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:bg-white/20 focus:outline-none focus:border-white/50 transition"
        :style="{ color: textColor }" :placeholder="$t('play.form.email_placeholder')">

      <input v-model="form.phone" type="tel"
        class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:bg-white/20 focus:outline-none focus:border-white/50 transition"
        :style="{ color: textColor }" :placeholder="$t('play.form.phone_placeholder')">

      <div class="pt-2">
        <label class="flex items-start gap-3 cursor-pointer">
          <div class="relative flex items-center">
            <input v-model="form.email_opt_in" type="checkbox" class="peer sr-only">
            <div class="w-5 h-5 border-2 border-white/40 rounded bg-transparent peer-checked:border-white/80 transition"
              :class="{ 'bg-white/20': form.email_opt_in }"></div>
            <Icon name="ph:check-bold" size="12" class="absolute left-1 opacity-0 peer-checked:opacity-100 transition" :style="{ color: textColor }" />
          </div>
          <span class="text-xs opacity-80 leading-tight pt-0.5">{{ $t('play.form.email_optin') }}</span>
        </label>
      </div>

      <button type="submit" :disabled="!canSubmit"
        class="bg-black/90 text-white w-full py-4 mt-4 text-lg font-bold rounded-xl shadow-lg transform transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
        {{ $t('play.form.submit') }}
      </button>
    </form>

    <button @click="emit('back')" class="text-sm opacity-60 hover:opacity-100 transition underline">
      {{ $t('play.form.back') }}
    </button>
  </div>
</template>

<style scoped>
.animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
