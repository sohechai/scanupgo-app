export const usePayment = () => {
	const { $api } = useNuxtApp()
	const toast = useToast()

	const loading = ref(false)
	const error = ref<string | null>(null)

	// Create Stripe Checkout Session and redirect to Stripe hosted page
	const createCheckoutSession = async (orderId: string) => {
		loading.value = true
		error.value = null

		try {
			const result = await $api<{ checkoutUrl: string; sessionId: string }>(
				`/orders/${orderId}/checkout-session`,
				{ method: 'POST' }
			)

			if (result.checkoutUrl) {
				// Redirect to Stripe Checkout
				window.location.href = result.checkoutUrl
			}

			return result
		} catch (e: any) {
			console.error('Failed to create checkout session:', e)
			error.value = e.data?.message || 'Erreur lors de la création de la session de paiement'
			toast.show(error.value, 'error')
			throw e
		} finally {
			loading.value = false
		}
	}

	// Verify checkout session after returning from Stripe
	const verifyCheckoutSession = async (orderId: string, sessionId: string) => {
		loading.value = true
		error.value = null

		try {
			const result = await $api<{ id?: string; paid?: boolean; status?: string }>(
				`/orders/${orderId}/verify-checkout`,
				{
					method: 'POST',
					body: { sessionId },
				}
			)
			return result
		} catch (e: any) {
			console.error('Failed to verify checkout session:', e)
			error.value = e.data?.message || 'Erreur lors de la vérification du paiement'
			throw e
		} finally {
			loading.value = false
		}
	}

	return {
		loading,
		error,
		createCheckoutSession,
		verifyCheckoutSession,
	}
}
