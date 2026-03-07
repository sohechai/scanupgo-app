<script setup lang="ts">
const { setLocale, locale } = useI18n()
const localeCookie = useCookie('i18n_locale')

onMounted(() => {
	const saved = localeCookie.value
	if (saved && ['fr', 'en', 'ar'].includes(saved) && saved !== locale.value) {
		setLocale(saved as 'fr' | 'en' | 'ar')
	}
	document.documentElement.dir = locale.value === 'ar' ? 'rtl' : 'ltr'
	document.documentElement.lang = locale.value
})
</script>

<template>
	<div :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'" :lang="$i18n.locale"
		class="bg-[#FDFBF7] font-sans text-slate-900 min-h-screen selection:bg-brand-500 selection:text-white"
		:class="$i18n.locale === 'ar' ? 'font-arabic' : ''">
		<NuxtLoadingIndicator color="#6366f1" :height="3" />
		<NuxtRouteAnnouncer />
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
	</div>
</template>

<style>
.page-enter-active,
.page-leave-active {
	transition: opacity 220ms ease, transform 220ms ease;
}

.page-enter-from {
	opacity: 0;
	transform: translateY(8px);
}

.page-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
