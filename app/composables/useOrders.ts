import JSZip from 'jszip'
import pkg from 'file-saver'
const { saveAs } = pkg

export interface Order {
	id: string
	orderNumber: string
	businessId: string
	productType: string
	quantity: number
	dimensions?: string
	paperType?: string
	description?: string
	notes?: string
	// Pricing
	unitPrice?: number
	totalPrice?: number
	currency?: string
	// Payment
	paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded'
	paymentMethod?: string
	stripePaymentIntentId?: string
	paidAt?: string
	// Delivery
	deliveryAddress: string
	deliveryCity: string
	deliveryZip: string
	deliveryCountry: string
	contactName: string
	contactPhone: string
	contactEmail: string
	// Status
	status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
	pdfUrl?: string
	flyerDesignUrl?: string
	trackingNumber?: string
	shippedAt?: string
	deliveredAt?: string
	createdAt: string
	updatedAt: string
	business?: {
		id: string
		name: string
		email?: string
		phone?: string
	}
}

export interface CreateOrderDto {
	productType: string
	quantity: number
	dimensions?: string
	paperType?: string
	description?: string
	notes?: string
	unitPrice?: number
	totalPrice?: number
	deliveryAddress: string
	deliveryCity: string
	deliveryZip: string
	deliveryCountry?: string
	contactName: string
	contactPhone: string
	contactEmail: string
	flyerDesignUrl?: string
	gameId?: string
}

export interface UpdateOrderStatusDto {
	status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
	trackingNumber?: string
	notes?: string
}

export interface OrderStats {
	total: number
	pending: number
	processing: number
	shipped: number
	delivered: number
	cancelled: number
}

export const useOrders = () => {
	const { $api } = useNuxtApp()
	const config = useRuntimeConfig()
	const toast = useToast()
	const { t } = useI18n()
	const { formatDate } = useLocaleDate()

	const orders = ref<Order[]>([])
	const stats = ref<OrderStats>({
		total: 0,
		pending: 0,
		processing: 0,
		shipped: 0,
		delivered: 0,
		cancelled: 0,
	})
	const loading = ref(false)

	const fetchOrders = async () => {
		loading.value = true
		try {
			const data = await $api<Order[]>('/orders')
			orders.value = data
		} catch (error: any) {
			console.error('Error fetching orders:', error)
			toast.show('Impossible de charger les commandes', 'error')
		} finally {
			loading.value = false
		}
	}

	const fetchStats = async () => {
		try {
			const data = await $api<OrderStats>('/orders/stats')
			stats.value = data
		} catch (error: any) {
			console.error('Error fetching stats:', error)
		}
	}

	const createOrder = async (orderData: CreateOrderDto) => {
		loading.value = true
		try {
			const data = await $api<Order>('/orders', {
				method: 'POST',
				body: orderData,
			})

			orders.value.unshift(data)
			await fetchStats()

			// Don't show success toast here - wait for payment confirmation

			return data
		} catch (error: any) {
			console.error('Error creating order:', error)
			toast.show(error.data?.message || 'Impossible de créer la commande', 'error')
			throw error
		} finally {
			loading.value = false
		}
	}

	const updateOrderStatus = async (orderId: string, statusData: UpdateOrderStatusDto) => {
		loading.value = true
		try {
			const data = await $api<Order>(`/orders/${orderId}/status`, {
				method: 'PATCH',
				body: statusData,
			})

			const index = orders.value.findIndex(o => o.id === orderId)
			if (index !== -1) {
				orders.value[index] = data
			}

			await fetchStats()

			toast.show('Statut mis à jour avec succès', 'success')

			return data
		} catch (error: any) {
			console.error('Error updating order status:', error)
			toast.show(error.data?.message || 'Impossible de mettre à jour le statut', 'error')
			throw error
		} finally {
			loading.value = false
		}
	}

	const downloadPdf = async (orderId: string, orderNumber: string) => {
		try {
			const response = await fetch(`${config.public.apiUrl}/orders/${orderId}/pdf`, {
				credentials: 'include', // Use session cookies
			})

			if (!response.ok) {
				throw new Error('Failed to download PDF')
			}

			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `commande-${orderNumber}.pdf`
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)

			toast.show('PDF téléchargé avec succès', 'success')
		} catch (error: any) {
			console.error('Error downloading PDF:', error)
			toast.show('Impossible de télécharger le PDF', 'error')
		}
	}

	const getStatusLabel = (status: string): string => {
		const labels: Record<string, string> = {
			pending: 'En attente',
			processing: 'En cours',
			shipped: 'Expédiée',
			delivered: 'Livrée',
			cancelled: 'Annulée',
		}
		return labels[status] || status
	}

	const getStatusColor = (status: string): string => {
		const colors: Record<string, string> = {
			pending: 'yellow',
			processing: 'blue',
			shipped: 'purple',
			delivered: 'green',
			cancelled: 'red',
		}
		return colors[status] || 'gray'
	}

	const getPaymentStatusLabel = (status?: string): string => {
		const labels: Record<string, string> = {
			pending: 'En attente',
			paid: 'Payé',
			failed: 'Échoué',
			refunded: 'Remboursé',
		}
		return labels[status || 'pending'] || status || 'En attente'
	}

	const getPaymentStatusColor = (status?: string): string => {
		const colors: Record<string, string> = {
			pending: 'yellow',
			paid: 'green',
			failed: 'red',
			refunded: 'purple',
		}
		return colors[status || 'pending'] || 'gray'
	}

	// Download multiple orders as a structured ZIP
	const downloadBulkForPrinting = async (
		orderIds: string[],
		options: { includeBonCommande?: boolean; includeFlyers?: boolean } = { includeBonCommande: true, includeFlyers: true }
	) => {
		const selectedOrders = orders.value.filter(o => orderIds.includes(o.id))
		if (selectedOrders.length === 0) {
			toast.show('Aucune commande sélectionnée', 'error')
			return
		}

		const zip = new JSZip()
		const today = new Date().toISOString().split('T')[0]

		// Create main folder with date
		const mainFolder = zip.folder(`Commandes_Imprimerie_${today}`)
		if (!mainFolder) return

		// Create subfolders
		const bonCommandeFolder = options.includeBonCommande ? mainFolder.folder('01_Bons_de_commande') : null
		const flyersFolder = options.includeFlyers ? mainFolder.folder('02_Flyers_HD') : null

		// Create summary file
		let summaryContent = `${t('orders.export.summary_title')}\n`
		summaryContent += `${'='.repeat(50)}\n`
		summaryContent += `${t('orders.export.export_date', { date: formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })}\n`
		summaryContent += `${t('orders.export.order_count', { count: selectedOrders.length })}\n\n`

		// Group orders by product type
		const ordersByType: Record<string, Order[]> = {}
		selectedOrders.forEach(order => {
			const type = order.productType || 'Autre'
			if (!ordersByType[type]) ordersByType[type] = []
			ordersByType[type].push(order)
		})

		summaryContent += `DÉTAIL PAR PRODUIT\n`
		summaryContent += `${'-'.repeat(50)}\n`

		let totalQuantity = 0
		for (const [type, typeOrders] of Object.entries(ordersByType)) {
			const qty = typeOrders.reduce((sum, o) => sum + o.quantity, 0)
			totalQuantity += qty
			summaryContent += `\n📦 ${type.toUpperCase()}\n`
			summaryContent += `   Quantité totale: ${qty} unités\n`
			summaryContent += `   Commandes:\n`
			typeOrders.forEach(o => {
				summaryContent += `   - #${o.orderNumber}: ${o.quantity}x (${o.business?.name || 'N/A'})\n`
			})
		}

		summaryContent += `\n${'='.repeat(50)}\n`
		summaryContent += `TOTAL GÉNÉRAL: ${totalQuantity} unités\n`
		summaryContent += `${'='.repeat(50)}\n\n`

		summaryContent += `LISTE DES FICHIERS\n`
		summaryContent += `${'-'.repeat(50)}\n`

		let successCount = 0
		let errorCount = 0

		// Process each order
		for (const order of selectedOrders) {
			const orderPrefix = `${order.orderNumber}_${(order.business?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}`

			// Download bon de commande PDF
			if (options.includeBonCommande && bonCommandeFolder) {
				try {
					const response = await fetch(`${config.public.apiUrl}/orders/${order.id}/pdf`, {
						credentials: 'include',
					})
					if (response.ok) {
						const blob = await response.blob()
						bonCommandeFolder.file(`${orderPrefix}_BonCommande.pdf`, blob)
						summaryContent += `✅ ${orderPrefix}_BonCommande.pdf\n`
						successCount++
					} else {
						summaryContent += `❌ ${orderPrefix}_BonCommande.pdf (erreur téléchargement)\n`
						errorCount++
					}
				} catch (e) {
					summaryContent += `❌ ${orderPrefix}_BonCommande.pdf (erreur)\n`
					errorCount++
				}
			}

			// Download flyer image
			if (options.includeFlyers && flyersFolder && order.flyerDesignUrl) {
				try {
					const response = await fetch(order.flyerDesignUrl)
					if (response.ok) {
						const blob = await response.blob()
						const extension = order.flyerDesignUrl.includes('.png') ? 'png' : 'jpg'
						flyersFolder.file(`${orderPrefix}_Flyer_HD.${extension}`, blob)
						summaryContent += `✅ ${orderPrefix}_Flyer_HD.${extension}\n`
						successCount++
					} else {
						summaryContent += `❌ ${orderPrefix}_Flyer_HD (erreur téléchargement)\n`
						errorCount++
					}
				} catch (e) {
					summaryContent += `❌ ${orderPrefix}_Flyer_HD (erreur)\n`
					errorCount++
				}
			} else if (options.includeFlyers && !order.flyerDesignUrl) {
				summaryContent += `⚠️ ${orderPrefix}_Flyer_HD (pas de flyer configuré)\n`
			}
		}

		summaryContent += `\n${'='.repeat(50)}\n`
		summaryContent += `Téléchargés: ${successCount} | Erreurs: ${errorCount}\n`

		// Add summary file
		mainFolder.file('00_RECAPITULATIF.txt', summaryContent)

		// Generate and download ZIP
		try {
			const content = await zip.generateAsync({ type: 'blob' })
			saveAs(content, `Commandes_Imprimerie_${today}.zip`)
			toast.show(`ZIP téléchargé (${successCount} fichiers)`, 'success')
		} catch (e) {
			console.error('ZIP generation failed:', e)
			toast.show('Erreur lors de la création du ZIP', 'error')
		}
	}

	// Quick download single order with both files
	const downloadOrderForPrinting = async (order: Order) => {
		await downloadBulkForPrinting([order.id], { includeBonCommande: true, includeFlyers: true })
	}

	return {
		orders,
		stats,
		loading,
		fetchOrders,
		fetchStats,
		createOrder,
		updateOrderStatus,
		downloadPdf,
		downloadBulkForPrinting,
		downloadOrderForPrinting,
		getStatusLabel,
		getStatusColor,
		getPaymentStatusLabel,
		getPaymentStatusColor,
	}
}
