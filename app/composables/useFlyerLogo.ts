import type { MaybeRefOrGetter } from 'vue'

export function useFlyerLogo(businessLogo: MaybeRefOrGetter<string | null | undefined>) {
	const config = useRuntimeConfig()
	const logoDataUrl = ref<string | null>(null)
	const logoLoadAttempted = ref(false)

	const loadLogoAsDataUrl = async (url: string | null | undefined) => {
		if (!url) {
			logoDataUrl.value = null
			logoLoadAttempted.value = false
			return
		}

		if (url.startsWith('data:')) {
			logoDataUrl.value = url
			logoLoadAttempted.value = true
			return
		}

		try {
			const response = await fetch(url, { mode: 'cors' })
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			const blob = await response.blob()
			const reader = new FileReader()
			reader.onloadend = () => {
				logoDataUrl.value = reader.result as string
				logoLoadAttempted.value = true
			}
			reader.onerror = () => {
				logoDataUrl.value = null
				logoLoadAttempted.value = true
			}
			reader.readAsDataURL(blob)
		} catch {
			try {
				const apiBase = config.public.apiUrl || 'http://localhost:4000'
				const proxyUrl = `${apiBase}/uploads/proxy?url=${encodeURIComponent(url)}`
				const proxyResponse = await fetch(proxyUrl)
				if (!proxyResponse.ok) throw new Error(`Proxy HTTP ${proxyResponse.status}`)
				const blob = await proxyResponse.blob()
				const reader = new FileReader()
				reader.onloadend = () => {
					logoDataUrl.value = reader.result as string
					logoLoadAttempted.value = true
				}
				reader.onerror = () => {
					logoDataUrl.value = null
					logoLoadAttempted.value = true
				}
				reader.readAsDataURL(blob)
			} catch {
				logoDataUrl.value = null
				logoLoadAttempted.value = true
			}
		}
	}

	const logoRef = computed(() => toValue(businessLogo))

	watch(logoRef, (newLogo) => loadLogoAsDataUrl(newLogo), { immediate: true })

	onMounted(() => {
		if (logoRef.value && !logoLoadAttempted.value) {
			loadLogoAsDataUrl(logoRef.value)
		}
	})

	const currentBusinessLogo = computed(() => logoDataUrl.value || logoRef.value)

	return { logoDataUrl, currentBusinessLogo }
}
