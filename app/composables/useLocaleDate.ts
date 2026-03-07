export const useLocaleDate = () => {
	const { locale } = useI18n()

	const localeMap: Record<string, string> = {
		fr: 'fr-FR',
		en: 'en-US',
		ar: 'ar-MA',
	}

	const currentLocale = computed(() => localeMap[locale.value] || 'fr-FR')

	const formatDate = (
		date: string | Date | null | undefined,
		options: Intl.DateTimeFormatOptions = {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		}
	): string => {
		if (!date) return ''
		return new Date(date).toLocaleDateString(currentLocale.value, options)
	}

	const formatNumber = (
		num: number,
		options?: Intl.NumberFormatOptions
	): string => {
		return num.toLocaleString(currentLocale.value, options)
	}

	const formatCurrency = (
		amount: number,
		currency: string = 'MAD'
	): string => {
		return new Intl.NumberFormat(currentLocale.value, {
			style: 'currency',
			currency,
		}).format(amount)
	}

	const formatRelativeTime = (date: string | Date): string => {
		const now = new Date()
		const d = new Date(date)
		const diffMs = now.getTime() - d.getTime()
		const diffMins = Math.floor(diffMs / 60000)
		const diffHours = Math.floor(diffMs / 3600000)
		const diffDays = Math.floor(diffMs / 86400000)

		const rtf = new Intl.RelativeTimeFormat(currentLocale.value, { numeric: 'auto' })

		if (diffMins < 1) return rtf.format(0, 'minute')
		if (diffMins < 60) return rtf.format(-diffMins, 'minute')
		if (diffHours < 24) return rtf.format(-diffHours, 'hour')
		if (diffDays < 30) return rtf.format(-diffDays, 'day')
		return formatDate(date)
	}

	return { formatDate, formatNumber, formatCurrency, formatRelativeTime, currentLocale }
}
