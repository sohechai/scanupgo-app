<script setup lang="ts">
import SmartFlyer from './SmartFlyer.vue'
import FlyerSidebar from './FlyerSidebar.vue'
import FlyerSmartControls from './FlyerSmartControls.vue'
import FlyerModals from './FlyerModals.vue'
import FlyerToolbar from './FlyerToolbar.vue'
import { nextTick } from 'vue' // Import nextTick

const props = defineProps<{
	gameId?: string
	businessLogo?: string | null
	qrCodeUrl?: string | null
	game?: any
	businessName?: string
	saving?: boolean
}>()

const config = useRuntimeConfig()

const { currentBusinessLogo } = useFlyerLogo(() => props.businessLogo)

onMounted(async () => {
	// Load templates from API
	try {
		const data = await $api<any[]>('/flyer-generator/templates')
		apiTemplates.value = data.map(t => ({
			id: t.id,
			name: t.name,
			description: t.description || '',
			icon: 'ph:image-fill',
			image: t.imageUrl,
		}))
	} catch (e) {
		console.error('Failed to load flyer templates:', e)
	}
})

const emit = defineEmits<{
	'save': [imageUrl: string, canvasJson?: Record<string, any>]
}>()

const { $api } = useNuxtApp()
const { show: showToast } = useToast()
const { t } = useI18n()

const canvasRef = ref<HTMLCanvasElement>()
const textColor = ref('#000000')
const textFontFamily = ref('Luckiest Guy')
const textAlign = ref<'left' | 'center' | 'right'>('left')

const { canvas, CANVAS_WIDTH, CANVAS_HEIGHT, initCanvas, configureObjectControls, loadFlyerImageAsBackground } = useFabricCanvas(canvasRef, { textColor, textFontFamily, textAlign })

const uploading = ref(false)
const exporting = ref(false)
const selectedObject = ref<any>(null)
const selectedObjectColor = ref('#000000')

// Smart Flyer Customization Options
const smartOptions = ref({
	backgroundColor: props.game?.primaryColor || '#fb923c',
	accentColor: '#fb923c',
	buttonColor: props.game?.primaryColor || '#fb923c',
	fontFamily: 'Luckiest Guy',
	conditions: '',
	footerIconColor: '#000000',
	lostColor: '#000000',
	qrColor: '#000000',
	qrBgColor: '#ffffff',
})

// Watch game prop changes to update defaults if needed
watch(() => props.game, (newGame) => {
	if (newGame?.primaryColor) {
		smartOptions.value.backgroundColor = newGame.primaryColor
		smartOptions.value.buttonColor = newGame.primaryColor
		smartOptions.value.accentColor = newGame.primaryColor
	}
	if (newGame?.qrCodeColor) smartOptions.value.qrColor = newGame.qrCodeColor
	if (newGame?.qrCodeBgColor) smartOptions.value.qrBgColor = newGame.qrCodeBgColor
}, { immediate: true })

const updateSelectedColor = (event: Event) => {
	// This function was likely intended to be part of the original code,
	// but was included in the insertion snippet.
	// Its implementation is missing, so it's left as is to maintain the provided snippet.
}
const selectedBaseTemplate = ref<string>('blank')
const loadingTemplate = ref(false)
const converting = ref(false)
const mode = ref<'canvas' | 'smart'>('canvas') // New: Mode for editor
const smartFlyerRef = ref<any>(null) // New: Ref for SmartFlyer component

// Confirmation modal before smart→canvas conversion
const showConversionModal = ref(false)
let conversionResolve: ((confirmed: boolean) => void) | null = null

const requestConversionConfirm = (): Promise<boolean> =>
	new Promise((resolve) => {
		conversionResolve = resolve
		showConversionModal.value = true
	})

const confirmConversion = () => {
	showConversionModal.value = false
	conversionResolve?.(true)
	conversionResolve = null
}

const cancelConversion = () => {
	showConversionModal.value = false
	conversionResolve?.(false)
	conversionResolve = null
}

// Static templates (special modes, not images)
const staticTemplates = computed(() => [
	{ id: 'smart', name: t('flyers.editor.template_smart'), description: t('flyers.editor.template_smart_desc'), icon: 'ph:magic-wand-fill', image: null, isSmart: true },
	{ id: 'blank', name: t('flyers.editor.template_blank'), description: t('flyers.editor.template_blank_desc'), icon: 'ph:file-dashed', image: null },
])

// Templates loaded from API
const apiTemplates = ref<any[]>([])

const templates = computed(() => [...staticTemplates.value, ...apiTemplates.value])



onMounted(async () => {
	if (process.client) {
		await Promise.allSettled([
			document.fonts.load('20px "Luckiest Guy"'),
			document.fonts.load('20px "Anton"'),
			document.fonts.load('20px "Bangers"'),
			document.fonts.load('20px "Righteous"'),
		])
	}
	await initCanvas()

	const savedJson = props.game?.flyerDesignJson
		? (typeof props.game.flyerDesignJson === 'string'
			? JSON.parse(props.game.flyerDesignJson)
			: props.game.flyerDesignJson)
		: null

	if (savedJson?._mode === 'smart') {
		if (savedJson.fontFamily) smartOptions.value.fontFamily = savedJson.fontFamily
		if (savedJson.backgroundColor) smartOptions.value.backgroundColor = savedJson.backgroundColor
		if (savedJson.accentColor) smartOptions.value.accentColor = savedJson.accentColor
		if (savedJson.buttonColor) smartOptions.value.buttonColor = savedJson.buttonColor
		if (savedJson.footerIconColor) smartOptions.value.footerIconColor = savedJson.footerIconColor
		if (savedJson.lostColor) smartOptions.value.lostColor = savedJson.lostColor
		if (savedJson.qrColor) smartOptions.value.qrColor = savedJson.qrColor
		if (savedJson.qrBgColor) smartOptions.value.qrBgColor = savedJson.qrBgColor
		mode.value = 'smart'
		selectedBaseTemplate.value = 'smart'
		return
	}

	if (canvas.value) {
		canvas.value.backgroundColor = '#ffffff'

		if (savedJson) {
			if (savedJson._template) selectedBaseTemplate.value = savedJson._template
			try {
				await canvas.value.loadFromJSON(savedJson)
			} catch {
				if (props.game?.flyerDesignUrl) await loadFlyerImageAsBackground(props.game.flyerDesignUrl)
			}
		} else if (props.game?.flyerDesignUrl) {
			await loadFlyerImageAsBackground(props.game.flyerDesignUrl)
		} else {
			mode.value = 'smart'
			selectedBaseTemplate.value = 'smart'
		}

		canvas.value.renderAll()
	}
})

// Load template
const loadTemplate = async (templateId: string) => {
	const template = templates.value.find((t: any) => t.id === templateId)
	if (!template) return

	if (template.isSmart) {
		// Save ref and clear it BEFORE switching mode so Vue removes the canvas
		// element from DOM first, then we dispose Fabric safely
		const canvasToDispose = canvas.value
		canvas.value = null
		mode.value = 'smart'
		selectedBaseTemplate.value = templateId
		// Wait for Vue to remove the canvas DOM element, then dispose Fabric
		await nextTick()
		if (canvasToDispose) {
			try {
				await canvasToDispose.dispose()
			} catch (e) {
				console.warn('Canvas dispose error (safe to ignore):', e)
			}
		}
		showToast(t('flyers.editor.template_smart_loaded'), 'success')
		return
	}

	// Switch back to canvas mode if needed
	if (mode.value === 'smart') {
		canvas.value = null // Ensure fresh init
		mode.value = 'canvas'
		selectedBaseTemplate.value = templateId

		// Wait for Vue to re-create the canvas DOM element
		await nextTick()
		await new Promise(resolve => setTimeout(resolve, 100))

		// Recurse: Try loading the template again now that we are in canvas mode
		return loadTemplate(templateId)
	}

	// Double check canvas is initialized
	if (!canvas.value) {
		await initCanvas()
		// If still not ready (should not happen after recursion), try one last force init
		if (!canvas.value && canvasRef.value) {
			const fabric = await import('fabric')
			canvas.value = new fabric.Canvas(canvasRef.value, {
				width: CANVAS_WIDTH,
				height: CANVAS_HEIGHT,
				backgroundColor: '#ffffff',
			})
		}
	}

	if (!canvas.value) return

	loadingTemplate.value = true
	selectedBaseTemplate.value = templateId

	try {
		// Clear canvas
		canvas.value.clear()
		// Important: Set background color immediately to avoid white flash/empty
		canvas.value.backgroundColor = '#ffffff'

		if (templateId === 'blank') {
			// Just white background
			canvas.value.renderAll()
		} else if (template.image) {
			// Load template image as movable object
			const { FabricImage } = await import('fabric')

			FabricImage.fromURL(template.image, { crossOrigin: 'anonymous' }).then((img) => {
				if (!canvas.value) return

				// Scale image to fit canvas while maintaining aspect ratio
				// Use Math.max to ensure it covers the entire canvas, like a background
				const scaleX = CANVAS_WIDTH / (img.width || 1)
				const scaleY = CANVAS_HEIGHT / (img.height || 1)
				const scale = Math.max(scaleX, scaleY)

				img.set({
					left: CANVAS_WIDTH / 2,
					top: CANVAS_HEIGHT / 2,
					scaleX: scale,
					scaleY: scale,
					originX: 'center',
					originY: 'center',
					selectable: true, // Make it selectable for adjustment
					evented: true,
				})

				// Configure controls for rotation and scaling
				configureObjectControls(img)

				canvas.value.add(img)
				// Fabric v6/v7 fix: use moveObjectTo index 0 instead of sendToBack if deprecated
				if (typeof canvas.value.sendToBack === 'function') {
					canvas.value.sendToBack(img)
				} else {
					canvas.value.moveObjectTo(img, 0)
				}
				canvas.value.renderAll()
			})
		} // End if template.image

		showToast(`Template chargé`, 'success')
	} catch (e) {
		console.error('Template loading failed', e)
		showToast('Erreur lors du chargement du template', 'error')
	} finally {
		loadingTemplate.value = false
	}
}

// Convert smart template to editable canvas (load smart flyer as background image)
const convertSmartToCanvas = async (): Promise<boolean> => {
	if (mode.value !== 'smart') return true

	// Ask user to confirm before destroying smart mode controls
	const confirmed = await requestConversionConfirm()
	if (!confirmed) return false

	converting.value = true
	// Use server-side Puppeteer rendering (html2canvas fails to load Google Fonts correctly)
	const imageUrl = await smartFlyerRef.value?.exportImage()
	if (!imageUrl) {
		converting.value = false
		showToast('Erreur lors de la conversion du template', 'error')
		return false
	}

	const canvasToDispose = canvas.value
	const savedSmartOptions = { ...smartOptions.value }
	canvas.value = null
	mode.value = 'canvas'
	selectedBaseTemplate.value = 'blank'

	await nextTick()
	await new Promise(resolve => setTimeout(resolve, 100))

	if (canvasToDispose) {
		try { await canvasToDispose.dispose() } catch {}
	}

	await initCanvas()
	if (!canvas.value) {
		// Rollback to smart mode
		mode.value = 'smart'
		smartOptions.value = savedSmartOptions
		converting.value = false
		showToast('Erreur lors de l\'initialisation du canvas', 'error')
		return false
	}

	// Convert CDN URL to data URL via backend proxy to avoid CORS restrictions in Fabric canvas
	let canvasImageUrl = imageUrl
	if (!imageUrl.startsWith('data:')) {
		try {
			const apiBase = config.public.apiUrl || 'http://localhost:4000'
			const proxyUrl = `${apiBase}/uploads/proxy?url=${encodeURIComponent(imageUrl)}`
			const response = await fetch(proxyUrl)
			if (response.ok) {
				const blob = await response.blob()
				canvasImageUrl = await new Promise<string>((resolve, reject) => {
					const reader = new FileReader()
					reader.onloadend = () => resolve(reader.result as string)
					reader.onerror = reject
					reader.readAsDataURL(blob)
				})
			}
		} catch (e) {
			console.warn('Proxy failed, using direct URL:', e)
		}
	}

	try {
		const { FabricImage } = await import('fabric')
		const img = await FabricImage.fromURL(canvasImageUrl, { crossOrigin: 'anonymous' })
		if (!img.width || !img.height) throw new Error('Image failed to load')
		const scaleX = CANVAS_WIDTH / img.width
		const scaleY = CANVAS_HEIGHT / img.height
		img.set({
			left: CANVAS_WIDTH / 2,
			top: CANVAS_HEIGHT / 2,
			scaleX: Math.max(scaleX, scaleY),
			scaleY: Math.max(scaleX, scaleY),
			originX: 'center',
			originY: 'center',
			selectable: false,
			evented: false,
		})
		canvas.value.add(img)
		if (typeof canvas.value.sendToBack === 'function') canvas.value.sendToBack(img)
		else canvas.value.moveObjectTo(img, 0)
		canvas.value.renderAll()
		converting.value = false
		showToast('Template converti en canvas éditable', 'success')
		return true
	} catch (e) {
		console.error('Failed to load converted image onto canvas:', e)
		// Rollback to smart mode
		mode.value = 'smart'
		smartOptions.value = savedSmartOptions
		converting.value = false
		await nextTick()
		showToast('Erreur lors du chargement de l\'image. Retour au mode intelligent.', 'error')
		return false
	}
}

// Add text to canvas
const addText = async () => {
	const ready = await convertSmartToCanvas()
	if (!ready || !canvas.value) return

	const { Textbox } = await import('fabric')

	// Ensure font is fully loaded in the canvas context before rendering
	await document.fonts.load(`20px "${textFontFamily.value}"`)
	await document.fonts.ready

	const text = new Textbox('Nouveau texte', {
		left: 100,
		top: 100,
		width: 200,
		fontSize: 20,
		fill: textColor.value,
		fontFamily: textFontFamily.value,
	})

	configureObjectControls(text)

	canvas.value.add(text)
	canvas.value.setActiveObject(text)
	canvas.value.renderAll()
}


// Add business logo to canvas
const addLogo = async () => {
	const ready = await convertSmartToCanvas()
	if (!ready) return
	if (!canvas.value || !props.businessLogo) {
		showToast('Aucun logo disponible', 'error')
		return
	}

	const { FabricImage } = await import('fabric')

	// Try to use the data URL if already loaded, otherwise use proxy
	let logoUrl = currentBusinessLogo.value || props.businessLogo

	// If it's an R2 URL, use the proxy
	if (logoUrl && logoUrl.includes('r2.dev') && !logoUrl.startsWith('data:')) {
		const apiBase = config.public.apiUrl || 'http://localhost:4000'
		logoUrl = `${apiBase}/uploads/proxy?url=${encodeURIComponent(logoUrl)}`
	}

	FabricImage.fromURL(logoUrl, { crossOrigin: 'anonymous' }).then((img) => {
		if (!canvas.value) return

		img.scale(0.3)
		img.set({
			left: 50,
			top: 150,
		})

		configureObjectControls(img)

		canvas.value.add(img)
		canvas.value.setActiveObject(img)
		canvas.value.renderAll()
	}).catch((err) => {
		console.error('Failed to load logo:', err)
		showToast('Erreur lors du chargement du logo', 'error')
	})
}

// QR Code Customizer Modal
const showQRCodeModal = ref(false)
const customQRCodeUrl = ref<string | null>(null)

const getGameUrl = () => {
	if (!props.game?.slug) return ''
	const baseUrl = config.public.siteUrl || window.location.origin
	return `${baseUrl}/play/${props.game.slug}`
}

const openQRCodeModal = async () => {
	const ready = await convertSmartToCanvas()
	if (!ready) return
	showQRCodeModal.value = true
}

const closeQRCodeModal = () => {
	showQRCodeModal.value = false
}

// Handle QR customization update (preview)
const handleQRCodeUpdate = (data: { qrCodeDataUrl: string; color: string; bgColor: string; logoUrl: string | null }) => {
	customQRCodeUrl.value = data.qrCodeDataUrl
}

// Handle QR customization save - add to canvas
const handleQRCodeSave = async (data: { color: string; bgColor: string; logoUrl: string | null }) => {
	if (!canvas.value || !customQRCodeUrl.value) {
		showToast('Erreur lors de l\'ajout du QR code', 'error')
		return
	}

	const { FabricImage } = await import('fabric')

	FabricImage.fromURL(customQRCodeUrl.value, { crossOrigin: 'anonymous' }).then((img) => {
		if (!canvas.value) return

		img.scale(0.4)
		img.set({
			left: CANVAS_WIDTH / 2 - 60,
			top: CANVAS_HEIGHT - 180,
		})

		configureObjectControls(img)

		canvas.value.add(img)
		canvas.value.setActiveObject(img)
		canvas.value.renderAll()

		showToast('QR code ajouté au flyer', 'success')
		closeQRCodeModal()
	})
}

// Add QR code to canvas (opens modal for customization)
const addQRCode = () => {
	openQRCodeModal()
}

// Upload and add custom image
const handleImageFile = async (file: File) => {
	const ready = await convertSmartToCanvas()
	if (!ready) return

	const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
	if (!allowedTypes.includes(file.type)) {
		showToast('Format non supporté. Utilisez JPG, PNG, WebP ou GIF.', 'error')
		return
	}

	const maxSize = 5 * 1024 * 1024
	if (file.size > maxSize) {
		showToast('Le fichier est trop volumineux (max 5MB)', 'error')
		return
	}

	uploading.value = true

	try {
		const formData = new FormData()
		formData.append('file', file)

		const response = await $api<{ url: string }>('/uploads', {
			method: 'POST',
			body: formData
		})

		if (response?.url) {
			const { FabricImage } = await import('fabric')

			// Add uploaded image to canvas
			FabricImage.fromURL(response.url, { crossOrigin: 'anonymous' }).then((img) => {
				if (!canvas.value) return

				// Scale to fit canvas
				const scale = Math.min(250 / (img.width || 1), 250 / (img.height || 1))
				img.scale(scale)
				img.set({
					left: 100,
					top: 200,
				})

				configureObjectControls(img)

				canvas.value.add(img)
				canvas.value.setActiveObject(img)
				canvas.value.renderAll()
			})

			showToast('Image ajoutée avec succès', 'success')
		}
	} catch (e) {
		console.error('Upload failed', e)
		showToast('Erreur lors de l\'upload de l\'image', 'error')
	} finally {
		uploading.value = false
	}
}

// Delete selected object
const deleteSelected = async () => {
	const ready = await convertSmartToCanvas()
	if (!ready || !canvas.value) return

	const activeObject = canvas.value.getActiveObject()
	if (activeObject) {
		canvas.value.remove(activeObject)
		canvas.value.renderAll()
	} else {
		showToast('Aucun élément sélectionné', 'info')
	}
}

// Center selected object
const centerSelected = async () => {
	const ready = await convertSmartToCanvas()
	if (!ready || !canvas.value) return

	const activeObject = canvas.value.getActiveObject()
	if (activeObject) {
		activeObject.set({
			left: CANVAS_WIDTH / 2,
			top: CANVAS_HEIGHT / 2,
			originX: 'center',
			originY: 'center'
		})
		activeObject.setCoords()
		canvas.value.renderAll()
		showToast('Élément centré', 'success')
	} else {
		showToast('Aucun élément sélectionné', 'info')
	}
}

// Center horizontally
const centerHorizontally = async () => {
	const ready = await convertSmartToCanvas()
	if (!ready || !canvas.value) return

	const activeObject = canvas.value.getActiveObject()
	if (activeObject) {
		activeObject.set({
			left: CANVAS_WIDTH / 2,
			originX: 'center'
		})
		activeObject.setCoords()
		canvas.value.renderAll()
	} else {
		showToast('Aucun élément sélectionné', 'info')
	}
}

// Center vertically
const centerVertically = async () => {
	const ready = await convertSmartToCanvas()
	if (!ready || !canvas.value) return

	const activeObject = canvas.value.getActiveObject()
	if (activeObject) {
		activeObject.set({
			top: CANVAS_HEIGHT / 2,
			originY: 'center'
		})
		activeObject.setCoords()
		canvas.value.renderAll()
	} else {
		showToast('Aucun élément sélectionné', 'info')
	}
}

// Clear canvas
const clearCanvas = async () => {
	if (!canvas.value) return

	const confirmed = confirm('Êtes-vous sûr de vouloir tout effacer ?')
	if (!confirmed) return

	canvas.value.clear()
	canvas.value.backgroundColor = '#ffffff'
	canvas.value.renderAll()
	selectedBaseTemplate.value = 'blank'
}

// Change background color
const backgroundColor = ref('#ffffff')

watch(backgroundColor, (newColor) => {
	if (mode.value === 'smart') return // Not applicable in smart mode
	if (!canvas.value) return
	canvas.value.backgroundColor = newColor
	canvas.value.renderAll()
})

const changeTextColor = (color: string) => {
	if (mode.value === 'smart') return
	if (!canvas.value) return

	const activeObject = canvas.value.getActiveObject()
	if (activeObject && activeObject.type === 'textbox') {
		activeObject.set('fill', color)
		canvas.value.renderAll()
	}
}

watch(textColor, (newColor) => {
	changeTextColor(newColor)
})

const changeFontFamily = async (font: string) => {
	if (mode.value === 'smart') return
	if (!canvas.value) return
	await document.fonts.load(`20px "${font}"`)
	const activeObject = canvas.value.getActiveObject()
	if (activeObject && activeObject.type === 'textbox') {
		activeObject.set('fontFamily', font)
		canvas.value.renderAll()
	}
}

watch(textFontFamily, (newFont) => {
	changeFontFamily(newFont)
})

const changeTextAlign = (align: 'left' | 'center' | 'right') => {
	if (mode.value === 'smart') return
	if (!canvas.value) return
	const activeObject = canvas.value.getActiveObject()
	if (activeObject && activeObject.type === 'textbox') {
		activeObject.set('textAlign', align)
		canvas.value.renderAll()
	}
	textAlign.value = align
}

// Export canvas as image
const exportFlyer = async () => {
	if (mode.value === 'smart') {
		exporting.value = true
		try {
			const imageUrl = await smartFlyerRef.value?.exportImage()
			if (imageUrl) {
				emit('save', imageUrl, {
						_mode: 'smart',
						fontFamily: smartOptions.value.fontFamily,
						backgroundColor: smartOptions.value.backgroundColor,
						accentColor: smartOptions.value.accentColor,
						buttonColor: smartOptions.value.buttonColor,
						footerIconColor: smartOptions.value.footerIconColor,
						lostColor: smartOptions.value.lostColor,
						qrColor: smartOptions.value.qrColor,
						qrBgColor: smartOptions.value.qrBgColor,
					})
			} else {
				showToast('Erreur lors de l\'export du flyer intelligent', 'error')
			}
		} finally {
			exporting.value = false
		}
		return
	}

	if (!canvas.value) return

	exporting.value = true

	try {
		// Deselect all objects
		canvas.value.discardActiveObject()
		canvas.value.renderAll()

		// Export canvas to data URL
		const dataURL = canvas.value.toDataURL({
			format: 'png',
			quality: 1,
			multiplier: 3, // 3x resolution for print quality
		})

		// Convert data URL to blob
		const blob = await (await fetch(dataURL)).blob()

		// Create form data
		const formData = new FormData()
		formData.append('file', blob, 'flyer.png')

		// Upload to R2
		const response = await $api<{ url: string }>('/uploads', {
			method: 'POST',
			body: formData
		})

		if (response?.url) {
			showToast('Flyer exporté avec succès', 'success')
			const canvasJson = { ...(canvas.value?.toJSON() || {}), _template: selectedBaseTemplate.value }
			emit('save', response.url, canvasJson)
		}
	} catch (e) {
		console.error('Export failed', e)
		showToast('Erreur lors de l\'export du flyer', 'error')
	} finally {
		exporting.value = false
	}
}

// Download flyer locally as PNG
const downloadFlyer = () => {
	if (mode.value === 'smart') {
		smartFlyerRef.value?.downloadPNG()
		return
	}
	if (!canvas.value) return

	// Deselect all objects
	canvas.value.discardActiveObject()
	canvas.value.renderAll()

	const dataURL = canvas.value.toDataURL({
		format: 'png',
		quality: 1,
		multiplier: 3,
	})

	// Create download link
	const link = document.createElement('a')
	link.download = 'flyer.png'
	link.href = dataURL
	link.click()

	showToast('Flyer téléchargé en PNG', 'success')
}

// Print bleed constant (3mm standard bleed)
const BLEED_MM = 3
const CROP_MARK_LENGTH = 5 // mm
const CROP_MARK_OFFSET = 1 // mm gap between mark and bleed edge

// Draw crop marks on PDF for professional printing
const drawCropMarks = (pdf: any, bleed: number, pageW: number, pageH: number) => {
	pdf.setDrawColor(0, 0, 0)
	pdf.setLineWidth(0.25)

	const markLen = CROP_MARK_LENGTH
	const offset = CROP_MARK_OFFSET

	// Top-left
	pdf.line(bleed, 0 + offset, bleed, bleed - offset) // vertical
	pdf.line(0 + offset, bleed, bleed - offset, bleed) // horizontal

	// Top-right
	pdf.line(pageW - bleed, 0 + offset, pageW - bleed, bleed - offset)
	pdf.line(pageW - offset, bleed, pageW - bleed + offset, bleed)

	// Bottom-left
	pdf.line(bleed, pageH - offset, bleed, pageH - bleed + offset)
	pdf.line(0 + offset, pageH - bleed, bleed - offset, pageH - bleed)

	// Bottom-right
	pdf.line(pageW - bleed, pageH - offset, pageW - bleed, pageH - bleed + offset)
	pdf.line(pageW - offset, pageH - bleed, pageW - bleed + offset, pageH - bleed)
}

// Download flyer as PDF (with bleed and crop marks)
const downloadFlyerPDF = async () => {
	if (mode.value === 'smart') {
		smartFlyerRef.value?.downloadPDF()
		return
	}
	if (!canvas.value) return

	try {
		// Deselect all objects
		canvas.value.discardActiveObject()
		canvas.value.renderAll()

		// Dynamic import of jsPDF
		const { jsPDF } = await import('jspdf')

		// Export canvas to data URL
		const dataURL = canvas.value.toDataURL({
			format: 'png',
			quality: 1,
			multiplier: 3,
		})

		// A6 dimensions + bleed (3mm each side)
		const contentW = 105 // A6 width in mm
		const contentH = 148 // A6 height in mm
		const totalW = contentW + BLEED_MM * 2 // 111mm
		const totalH = contentH + BLEED_MM * 2 // 154mm

		// Create PDF with bleed area
		const pdf = new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: [totalW, totalH]
		})

		// Fill bleed area with image (stretched slightly to cover bleed)
		pdf.addImage(dataURL, 'PNG', 0, 0, totalW, totalH)

		// Draw crop marks
		drawCropMarks(pdf, BLEED_MM, totalW, totalH)

		// Download PDF
		pdf.save('flyer-print.pdf')

		showToast('PDF avec fond perdu téléchargé (3mm bleed)', 'success')
	} catch (e) {
		console.error('PDF export failed', e)
		showToast('Erreur lors de l\'export en PDF', 'error')
	}
}

// Order printed flyers - open order modal
const showOrderModal = ref(false)
const orderFlyerDesignUrl = ref<string | undefined>(undefined)
const orderLoading = ref(false)

const orderFlyers = async () => {
	if (mode.value === 'smart') {
		// Generate the flyer first to get the design URL
		orderLoading.value = true
		try {
			const imageUrl = await smartFlyerRef.value?.exportImage()
			if (imageUrl) {
				orderFlyerDesignUrl.value = imageUrl
				showOrderModal.value = true
			} else {
				showToast('Erreur lors de la génération du flyer pour la commande', 'error')
			}
		} catch (e) {
			console.error('Order flyer generation failed', e)
			showToast('Erreur lors de la génération du flyer', 'error')
		} finally {
			orderLoading.value = false
		}
	} else {
		// Canvas mode - export canvas as image
		if (!canvas.value) return
		orderLoading.value = true
		try {
			canvas.value.discardActiveObject()
			canvas.value.renderAll()
			const dataURL = canvas.value.toDataURL({
				format: 'png',
				quality: 1,
				multiplier: 3,
			})
			orderFlyerDesignUrl.value = dataURL
			showOrderModal.value = true
		} catch (e) {
			console.error('Canvas export failed', e)
			showToast('Erreur lors de l\'export du canvas', 'error')
		} finally {
			orderLoading.value = false
		}
	}
}

const handleOrderCreated = () => {
	showToast('Commande créée avec succès !', 'success')
	orderFlyerDesignUrl.value = undefined
}

// Preview generated flyer (test button)
const previewing = ref(false)
const previewFlyer = async () => {
	// Open window immediately (before async) to avoid popup blocker
	const newWindow = window.open('', '_blank')
	if (!newWindow) {
		showToast('Le navigateur a bloqué l\'ouverture de la fenêtre. Autorisez les popups.', 'error')
		return
	}

	// Show loading state in new window
	newWindow.document.write(`
		<html>
			<head><title>Génération en cours...</title></head>
			<body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;background:#f1f5f9;">
				<div style="text-align:center;">
					<div style="width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px;"></div>
					<p style="color:#64748b;">Génération de l'aperçu...</p>
				</div>
				<style>@keyframes spin{to{transform:rotate(360deg)}}</style>
			</body>
		</html>
	`)

	previewing.value = true
	try {
		let imageUrl: string | null = null

		if (mode.value === 'smart') {
			imageUrl = await smartFlyerRef.value?.exportImage()
		} else if (canvas.value) {
			// Canvas mode: export canvas to data URL
			canvas.value.discardActiveObject()
			canvas.value.renderAll()
			imageUrl = canvas.value.toDataURL({
				format: 'png',
				quality: 1,
				multiplier: 3,
			})
		}

		if (imageUrl) {
			// Handle both data URLs and regular URLs
			if (imageUrl.startsWith('data:')) {
				// Convert data URL to blob and open
				const response = await fetch(imageUrl)
				const blob = await response.blob()
				const blobUrl = URL.createObjectURL(blob)
				newWindow.location.href = blobUrl
				// Clean up blob URL after a delay
				setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
			} else {
				// Regular URL - redirect to it
				newWindow.location.href = imageUrl
			}
			showToast('Aperçu généré avec succès', 'success')
		} else {
			newWindow.close()
			showToast('Erreur lors de la génération de l\'aperçu', 'error')
		}
	} catch (e) {
		console.error('Preview failed', e)
		newWindow.close()
		showToast('Erreur lors de la génération de l\'aperçu', 'error')
	} finally {
		previewing.value = false
	}
}

</script>

<template>
	<div class="flyer-editor min-h-[600px] flex flex-col xl:flex-row gap-6 relative">

		<!-- LEFT SIDEBAR -->
		<FlyerSidebar
			:has-logo="!!businessLogo"
			:has-qr-code="!!qrCodeUrl"
			:uploading="uploading"
			:loading-template="loadingTemplate"
			:selected-template="selectedBaseTemplate"
			:templates="templates"
			@add-text="addText"
			@add-logo="addLogo"
			@add-qr-code="addQRCode"
			@center-horizontally="centerHorizontally"
			@center-vertically="centerVertically"
			@load-template="loadTemplate"
			@image-file-selected="handleImageFile"
		/>

		<!-- MAIN CANVAS AREA -->
		<div
			class="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden">

			<!-- TOP BAR: ACTIONS -->
			<FlyerToolbar
				:mode="mode"
				:background-color="backgroundColor"
				:text-color="textColor"
				:text-font-family="textFontFamily"
				:text-align="textAlign"
				:previewing="previewing"
				:exporting="exporting"
				:saving="saving ?? false"
				:order-loading="orderLoading"
				@update:background-color="backgroundColor = $event"
				@update:text-color="textColor = $event"
				@update:text-font-family="textFontFamily = $event"
				@change-text-align="changeTextAlign"
				@delete="deleteSelected"
				@clear="clearCanvas"
				@preview="previewFlyer"
				@download-png="downloadFlyer"
				@download-pdf="downloadFlyerPDF"
				@order="orderFlyers"
				@save="exportFlyer"
			/>

			<!-- CANVAS CONTAINER -->
			<div
				class="flex-1 flex items-center justify-center p-8 bg-[url('https://res.cloudinary.com/dts5p63s6/image/upload/v1727712392/grid-pattern_m4yq7j.svg')] bg-[length:24px_24px] overflow-auto">


				<div v-if="mode === 'smart'" class="flex flex-col items-center gap-6 py-6 w-full">
					<SmartFlyer ref="smartFlyerRef" :game="game" :business-name="businessName"
						:business-logo="currentBusinessLogo" :qr-code-url="qrCodeUrl"
						:primary-color="smartOptions.backgroundColor" :accent-color="smartOptions.accentColor"
						:button-color="smartOptions.buttonColor" :font-family="smartOptions.fontFamily"
						:prizes="game?.prizes" :conditions="smartOptions.conditions"
						:footer-icon-color="smartOptions.footerIconColor" :lost-color="smartOptions.lostColor"
						:qr-color="smartOptions.qrColor" :qr-bg-color="smartOptions.qrBgColor"
						:qr-play-url="getGameUrl()" />

					<!-- Floating Smart Controls -->
					<FlyerSmartControls v-model="smartOptions" />
				</div><!-- Canvas Mode -->
				<div v-else class="relative shadow-2xl shadow-slate-400/20 rounded-sm">
					<canvas ref="canvasRef"></canvas>

					<!-- Loading Overlay -->
					<div v-if="loadingTemplate"
						class="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
						<Icon name="ph:spinner-gap-bold" class="text-brand-500 animate-spin" size="32" />
					</div>
				</div>
			</div>

			<!-- FOOTER HINT -->
			<div class="py-2 px-4 bg-white border-t border-slate-200 text-center">
				<p v-if="mode === 'canvas'" class="text-[10px] text-slate-400 font-medium">{{ $t('flyers.editor.hint_canvas') }}</p>
				<p v-else class="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-2">
					<Icon name="ph:info-fill" size="14" class="text-brand-500" />
					{{ $t('flyers.editor.hint_smart') }}
				</p>
			</div>
		</div>

		<!-- Conversion Loading Overlay -->
		<Transition name="modal">
			<div v-if="converting" class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm rounded-3xl">
				<div class="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
					<Icon name="ph:spinner-gap-bold" size="32" class="text-white animate-spin" />
				</div>
				<p class="text-white text-sm font-bold tracking-wide">Conversion en cours…</p>
			</div>
		</Transition>

		<FlyerModals
			:show-qr-modal="showQRCodeModal"
			:game-url="getGameUrl()"
			:qr-code-color="game?.qrCodeColor || '#000000'"
			:qr-code-bg-color="game?.qrCodeBgColor || '#ffffff'"
			:qr-code-logo-url="game?.qrCodeLogoUrl || ''"
			:show-order-modal="showOrderModal"
			:order-flyer-design-url="orderFlyerDesignUrl"
			:show-conversion-modal="showConversionModal"
			@close-qr-modal="closeQRCodeModal"
			@qr-update="handleQRCodeUpdate"
			@qr-save="handleQRCodeSave"
			@update:show-order-modal="showOrderModal = $event"
			@order-created="handleOrderCreated"
			@cancel-conversion="cancelConversion"
			@confirm-conversion="confirmConversion"
		/>
	</div>
</template>

<style scoped>
.flyer-editor {
	max-width: 100%;
}

.modal-enter-active,
.modal-leave-active {
	transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
	opacity: 0;
}
</style>
