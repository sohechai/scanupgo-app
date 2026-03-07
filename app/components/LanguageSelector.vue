<script setup lang="ts">
const props = defineProps<{
	variant?: 'default' | 'dark' | 'minimal'
}>()

const { locale, setLocale } = useI18n()
const localeCookie = useCookie('i18n_locale', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
const isOpen = ref(false)

const locales = [
	{ code: 'fr', label: 'Français', short: 'FR', flag: '🇫🇷' },
	{ code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
	{ code: 'ar', label: 'العربية', short: 'AR', flag: '🇲🇦' },
]

const currentLocale = computed(() => locales.find(l => l.code === locale.value) ?? locales[0]!)

const switchLanguage = async (code: 'fr' | 'en' | 'ar') => {
	isOpen.value = false
	await setLocale(code)
	localeCookie.value = code
	if (import.meta.client) {
		document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr'
		document.documentElement.lang = code
	}

	// Sync to backend if user is authenticated
	try {
		const { $api } = useNuxtApp()
		const authStore = useAuthStore()
		if (authStore.isAuthenticated) {
			await $api('/auth/update-language', {
				method: 'POST',
				body: { preferredLanguage: code },
			})
		}
	} catch {
		// Non-blocking
	}
}

// Close dropdown on click outside
const dropdownRef = ref<HTMLElement>()
onMounted(() => {
	const handler = (e: MouseEvent) => {
		if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
			isOpen.value = false
		}
	}
	document.addEventListener('click', handler)
	onUnmounted(() => document.removeEventListener('click', handler))
})
</script>

<template>
	<div ref="dropdownRef" class="relative">
		<button
			@click="isOpen = !isOpen"
			class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
			:class="{
				'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300': variant !== 'dark',
				'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20': variant === 'dark',
			}"
		>
			<span class="text-sm">{{ currentLocale.flag }}</span>
			<span>{{ currentLocale.short }}</span>
			<Icon name="ph:caret-down-bold" size="10" class="transition-transform opacity-60" :class="isOpen ? 'rotate-180' : ''" />
		</button>

		<Transition
			enter-active-class="transition ease-out duration-100"
			enter-from-class="opacity-0 scale-95"
			enter-to-class="opacity-100 scale-100"
			leave-active-class="transition ease-in duration-75"
			leave-from-class="opacity-100 scale-100"
			leave-to-class="opacity-0 scale-95"
		>
			<div
				v-if="isOpen"
				class="absolute top-full mt-1.5 w-36 rounded-xl shadow-xl border overflow-hidden z-50"
				:class="{
					'bg-white border-slate-200 right-0 rtl:right-auto rtl:left-0': variant !== 'dark',
					'bg-slate-900 border-white/10 right-0 rtl:right-auto rtl:left-0': variant === 'dark',
				}"
			>
				<button
					v-for="loc in locales"
					:key="loc.code"
					@click="switchLanguage(loc.code)"
					class="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium transition-colors"
					:class="{
						'text-slate-700 hover:bg-slate-50': variant !== 'dark' && loc.code !== locale,
						'text-brand-600 bg-brand-50 font-bold': variant !== 'dark' && loc.code === locale,
						'text-slate-300 hover:bg-white/5': variant === 'dark' && loc.code !== locale,
						'text-brand-400 bg-white/10 font-bold': variant === 'dark' && loc.code === locale,
					}"
				>
					<span class="text-sm">{{ loc.flag }}</span>
					<span>{{ loc.label }}</span>
				</button>
			</div>
		</Transition>
	</div>
</template>
