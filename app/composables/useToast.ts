export const useToast = () => {
	const toasts = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>('toasts', () => [])

	const show = (message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3000) => {
		const id = Math.random().toString(36).substring(7)
		toasts.value.push({ id, message, type })

		setTimeout(() => {
			remove(id)
		}, duration)
	}

	const remove = (id: string) => {
		toasts.value = toasts.value.filter(toast => toast.id !== id)
	}

	return {
		toasts,
		show,
		remove
	}
}
