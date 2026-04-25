<script setup lang="ts">
import SmartFlyer from './SmartFlyer.vue'
import QRCodeCustomizer from './QRCodeCustomizer.vue'
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

// Convert external URL to data URL to bypass CORS
const logoDataUrl = ref<string | null>(null)
const logoLoadAttempted = ref(false)

const loadLogoAsDataUrl = async (url: string | null | undefined) => {
	if (!url) {
		logoDataUrl.value = null
		logoLoadAttempted.value = false
		return
	}

	// If it's already a data URL, use it directly
	if (url.startsWith('data:')) {
		logoDataUrl.value = url
		logoLoadAttempted.value = true
		return
	}

	try {
		// First try direct fetch
		const response = await fetch(url, { mode: 'cors' })
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`)
		}
		const blob = await response.blob()
		const reader = new FileReader()

		reader.onloadend = () => {
			logoDataUrl.value = reader.result as string
			logoLoadAttempted.value = true
		}
		reader.onerror = () => {
			console.warn('Failed to convert logo to data URL')
			logoDataUrl.value = null
			logoLoadAttempted.value = true
		}
		reader.readAsDataURL(blob)
	} catch (e) {
		console.warn('Direct fetch failed, trying proxy:', e)

		// Try using backend proxy to bypass CORS
		try {
			const apiBase = config.public.apiBase || 'http://localhost:4000'
			const proxyUrl = `${apiBase}/uploads/proxy?url=${encodeURIComponent(url)}`
			const proxyResponse = await fetch(proxyUrl)

			if (!proxyResponse.ok) {
				throw new Error(`Proxy HTTP ${proxyResponse.status}`)
			}

			const blob = await proxyResponse.blob()
			const reader = new FileReader()

			reader.onloadend = () => {
				logoDataUrl.value = reader.result as string
				logoLoadAttempted.value = true
			}
			reader.onerror = () => {
				console.warn('Failed to convert proxied logo to data URL')
				logoDataUrl.value = null
				logoLoadAttempted.value = true
			}
			reader.readAsDataURL(blob)
		} catch (proxyError) {
			console.warn('Proxy fetch also failed:', proxyError)
			logoDataUrl.value = null
			logoLoadAttempted.value = true
		}
	}
}

// Watch for logo changes and load as data URL
watch(() => props.businessLogo, (newLogo) => {
	loadLogoAsDataUrl(newLogo)
}, { immediate: true })

// Also try loading on mount in case the watch doesn't trigger
onMounted(async () => {
	if (props.businessLogo && !logoLoadAttempted.value) {
		loadLogoAsDataUrl(props.businessLogo)
	}

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

// Computed props for reactivity in child components
// Use data URL if available, otherwise fall back to original URL
const currentBusinessLogo = computed(() => logoDataUrl.value || props.businessLogo)
const currentBusinessName = computed(() => props.businessName)
const currentQrCodeUrl = computed(() => props.qrCodeUrl)
const currentGame = computed(() => props.game)

const emit = defineEmits<{
	'save': [imageUrl: string, canvasJson?: Record<string, any>]
}>()

const { $api } = useNuxtApp()
const { show: showToast } = useToast()
const { t } = useI18n()

const canvasRef = ref<HTMLCanvasElement>()
const canvas = shallowRef<any>(null)
const uploading = ref(false)
const exporting = ref(false)
// Track selected object
const selectedObject = ref<any>(null)
const selectedObjectColor = ref('#000000')

// Smart Flyer Customization Options
const smartOptions = ref({
	backgroundColor: props.game?.primaryColor || '#fb923c',
	accentColor: '#fb923c',
	buttonColor: props.game?.primaryColor || '#fb923c',
	fontFamily: 'Luckiest Guy',
	conditions: ''
})

// Watch game prop changes to update defaults if needed
watch(() => props.game, (newGame) => {
	if (newGame?.primaryColor) {
		smartOptions.value.backgroundColor = newGame.primaryColor
		smartOptions.value.buttonColor = newGame.primaryColor
		smartOptions.value.accentColor = newGame.primaryColor
	}
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

// Static templates (special modes, not images)
const staticTemplates = computed(() => [
	{ id: 'blank', name: t('flyers.editor.template_blank'), description: t('flyers.editor.template_blank_desc'), icon: 'ph:file-dashed', image: null },
	{ id: 'smart', name: t('flyers.editor.template_smart'), description: t('flyers.editor.template_smart_desc'), icon: 'ph:magic-wand-fill', image: null, isSmart: true },
])

// Templates loaded from API
const apiTemplates = ref<any[]>([])

const templates = computed(() => [...staticTemplates.value, ...apiTemplates.value])

// Canvas dimensions (A4 ratio - 595x842px for web, scaled down for A6)
const CANVAS_WIDTH = 420  // A6 width (105mm at 4px/mm)
const CANVAS_HEIGHT = 595 // A6 height (148mm at 4px/mm)

// New: Function to initialize Fabric canvas
const initCanvas = async () => {
	// Dynamic import for client-side only
	if (process.client && canvasRef.value && !canvas.value) { // Only initialize if not already initialized
		const fabric = await import('fabric')
		const { Canvas, Control, controlsUtils } = fabric

		canvas.value = new Canvas(canvasRef.value, {
			width: CANVAS_WIDTH,
			height: CANVAS_HEIGHT,
			backgroundColor: '#ffffff',
		})

		// Sync textColor, textFontFamily and textAlign when selecting a text object
		const syncTextProps = (e: any) => {
			const obj = e.selected?.[0] ?? e.target
			if (obj && obj.type === 'textbox') {
				if (obj.fill) textColor.value = obj.fill as string
				if (obj.fontFamily) textFontFamily.value = obj.fontFamily
				if (obj.textAlign) textAlign.value = obj.textAlign as 'left' | 'center' | 'right'
			}
		}
		canvas.value.on('selection:created', syncTextProps)
		canvas.value.on('selection:updated', syncTextProps)

		// Configure global control appearance
		if (fabric.Object && fabric.Object.prototype) {
			try {
				fabric.Object.prototype.transparentCorners = false
				fabric.Object.prototype.cornerSize = 12
				fabric.Object.prototype.cornerColor = '#00E5FF'
				fabric.Object.prototype.cornerStrokeColor = '#ffffff'
				fabric.Object.prototype.borderColor = '#00E5FF'
				fabric.Object.prototype.cornerStyle = 'circle'
				fabric.Object.prototype.touchCornerSize = 20
				fabric.Object.prototype.borderScaleFactor = 2

				// ✅ FIX FABRIC V7: Safer access to controls
				// Check if controls object exists before accessing mtr
				if (fabric.Object.prototype.controls && !fabric.Object.prototype.controls.mtr) {
					// Ensure controlsUtils is available
					const utils = (controlsUtils as any) || (fabric as any)?.controlsUtils

					if (utils) {
						fabric.Object.prototype.controls.mtr = new Control({
							x: 0,
							y: -0.5,
							offsetY: -30,
							cursorStyle: 'crosshair',
							actionHandler: utils.rotationWithSnapping || utils.rotateObject,
							actionName: 'rotate',
							render: utils.renderCircleControl,
						})
					}
				}
			} catch (err) {
				console.warn('Error configuring Fabric controls:', err)
			}
		}
	}
}

const loadFlyerImageAsBackground = async () => {
	if (!canvas.value || !props.game?.flyerDesignUrl) return
	try {
		const { FabricImage } = await import('fabric')
		const img = await FabricImage.fromURL(props.game.flyerDesignUrl, { crossOrigin: 'anonymous' })
		img.set({
			left: 0,
			top: 0,
			originX: 'left',
			originY: 'top',
			scaleX: CANVAS_WIDTH / (img.width || CANVAS_WIDTH),
			scaleY: CANVAS_HEIGHT / (img.height || CANVAS_HEIGHT),
			selectable: false,
			evented: false,
			lockMovementX: true,
			lockMovementY: true,
		})
		canvas.value.add(img)
		canvas.value.sendObjectToBack(img)
	} catch (e) {
		console.warn('Could not load flyer image as background:', e)
	}
}

onMounted(async () => {
	// Preload all canvas fonts so Fabric.js renders them correctly
	if (process.client) {
		await Promise.allSettled([
			document.fonts.load('20px "Luckiest Guy"'),
			document.fonts.load('20px "Anton"'),
			document.fonts.load('20px "Bangers"'),
			document.fonts.load('20px "Righteous"'),
		])
	}
	// Initialize Fabric only if not in smart mode initially (default is canvas)
	await initCanvas()

	const savedJson = props.game?.flyerDesignJson
		? (typeof props.game.flyerDesignJson === 'string'
			? JSON.parse(props.game.flyerDesignJson)
			: props.game.flyerDesignJson)
		: null

	// If flyer was saved in smart mode, switch automatically and restore options
	if (savedJson?._mode === 'smart') {
		if (savedJson.fontFamily) smartOptions.value.fontFamily = savedJson.fontFamily
		if (savedJson.backgroundColor) smartOptions.value.backgroundColor = savedJson.backgroundColor
		if (savedJson.accentColor) smartOptions.value.accentColor = savedJson.accentColor
		if (savedJson.buttonColor) smartOptions.value.buttonColor = savedJson.buttonColor
		mode.value = 'smart'
		return
	}

	if (canvas.value) {
		canvas.value.backgroundColor = '#ffffff'

		if (savedJson) {
			// Full restore: all Fabric.js objects are re-editable
			try {
				await canvas.value.loadFromJSON(savedJson)
			} catch (e) {
				console.warn('Could not restore canvas JSON, falling back to image:', e)
				await loadFlyerImageAsBackground()
			}
		} else if (props.game?.flyerDesignUrl) {
			// Fallback for flyers saved before JSON feature: load PNG as locked background
			await loadFlyerImageAsBackground()
		}

		canvas.value.renderAll()
	}
})

onBeforeUnmount(() => {
	const canvasToDispose = canvas.value
	canvas.value = null
	if (canvasToDispose) {
		canvasToDispose.dispose().catch(() => {})
	}
})

const configureObjectControls = (obj: any) => {
	// Configure controls appearance directly on the object
	obj.set({
		borderColor: '#00E5FF',
		cornerColor: '#ffffff',
		cornerStrokeColor: '#00E5FF',
		cornerStyle: 'circle',
		cornerSize: 10,
		transparentCorners: false,
		borderScaleFactor: 2,

		// Interaction settings
		lockRotation: false,
		lockScalingX: false,
		lockScalingY: false,
		lockMovementX: false,
		lockMovementY: false,
		lockUniScaling: false,
		selectable: true,
		evented: true,
		hasControls: true,
		hasBorders: true,
		objectCaching: false,
	})

	// Force controls visibility
	obj.setControlsVisibility({
		mt: true,
		mb: true,
		ml: true,
		mr: true,
		bl: true,
		br: true,
		tl: true,
		tr: true,
		mtr: true,
	})
}

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

	converting.value = true
	// Capture the smart flyer DOM directly (client-side, no server/Puppeteer needed)
	const imageUrl = await smartFlyerRef.value?.captureAsDataUrl()
	if (!imageUrl) {
		converting.value = false
		showToast('Erreur lors de la conversion du template', 'error')
		return false
	}

	const canvasToDispose = canvas.value
	canvas.value = null
	mode.value = 'canvas'
	selectedBaseTemplate.value = 'blank'

	await nextTick()
	await new Promise(resolve => setTimeout(resolve, 100))

	if (canvasToDispose) {
		try { await canvasToDispose.dispose() } catch {}
	}

	await initCanvas()
	if (!canvas.value) return false

	const { FabricImage } = await import('fabric')
	const img = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' })
	const scaleX = CANVAS_WIDTH / (img.width || 1)
	const scaleY = CANVAS_HEIGHT / (img.height || 1)
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
}

// Add text to canvas
const addText = async () => {
	const ready = await convertSmartToCanvas()
	if (!ready || !canvas.value) return

	const { Textbox } = await import('fabric')

	// Ensure the selected font is loaded before rendering
	await document.fonts.load(`20px "${textFontFamily.value}"`)

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
		const apiBase = config.public.apiBase || 'http://localhost:4000'
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
const fileInputRef = ref<HTMLInputElement>()

const triggerImageUpload = async () => {
	const ready = await convertSmartToCanvas()
	if (!ready) return
	fileInputRef.value?.click()
}

const handleImageUpload = async (event: Event) => {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]

	if (!file) return

	// Validate file size (5MB max)
	const maxSize = 5 * 1024 * 1024
	if (file.size > maxSize) {
		showToast('Le fichier est trop volumineux (max 5MB)', 'error')
		return
	}

	uploading.value = true

	try {
		const formData = new FormData()
		formData.append('file', file)

		const response = await $api<{ url: string }>('/uploads/image', {
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

// Change text color
const textColor = ref('#000000')

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

const textFontFamily = ref('Luckiest Guy')

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

const textAlign = ref<'left' | 'center' | 'right'>('left')

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
		const response = await $api<{ url: string }>('/uploads/image', {
			method: 'POST',
			body: formData
		})

		if (response?.url) {
			showToast('Flyer exporté avec succès', 'success')
			const canvasJson = canvas.value?.toJSON()
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

		<!-- LEFT SIDEBAR: TOOLS & TEMPLATES -->
		<div class="w-full xl:w-72 flex flex-col gap-6 shrink-0">

			<!-- Tools Panel -->
			<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
				<div class="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
					<h3
						class="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide">
						<Icon name="ph:toolbox-fill" class="text-brand-500" />
						{{ $t('flyers.editor.tools_title') }}
					</h3>
				</div>
				<div class="p-3 grid grid-cols-2 gap-2">
					<!-- Add Text -->
					<button @click="addText" type="button"
						class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group">
						<div
							class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
							<Icon name="ph:text-t-bold" size="20" />
						</div>
						<span class="text-xs font-bold">{{ $t('flyers.editor.tool_text') }}</span>
					</button>

					<!-- Add Logo -->
					<button @click="addLogo" type="button" :disabled="!businessLogo"
						class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group disabled:opacity-50 disabled:grayscale">
						<div
							class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
							<Icon name="ph:image-square-bold" size="20" />
						</div>
						<span class="text-xs font-bold">{{ $t('flyers.editor.tool_logo') }}</span>
					</button>

					<!-- Add QR Code -->
					<button @click="addQRCode" type="button" :disabled="!qrCodeUrl"
						class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group disabled:opacity-50 disabled:grayscale">
						<div
							class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
							<Icon name="ph:qr-code-bold" size="20" />
						</div>
						<span class="text-xs font-bold">QR Code</span>
					</button>

					<!-- Add Image -->
					<button @click="triggerImageUpload" type="button" :disabled="uploading"
						class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group disabled:opacity-50">
						<div
							class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
							<Icon v-if="uploading" name="ph:spinner-gap-bold" size="20" class="animate-spin" />
							<Icon v-else name="ph:upload-simple-bold" size="20" />
						</div>
						<span class="text-xs font-bold">{{ $t('flyers.editor.tool_image') }}</span>
					</button>
					<input type="file" ref="fileInputRef" @change="handleImageUpload" accept="image/*" class="hidden" />

					<!-- Center Horizontally -->
					<button @click="centerHorizontally" type="button"
						class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group">
						<div
							class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
							<Icon name="ph:align-center-horizontal-bold" size="20" />
						</div>
						<span class="text-xs font-bold">{{ $t('flyers.editor.tool_center_h') }}</span>
					</button>

					<!-- Center Vertically -->
					<button @click="centerVertically" type="button"
						class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group">
						<div
							class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
							<Icon name="ph:align-center-vertical-bold" size="20" />
						</div>
						<span class="text-xs font-bold">{{ $t('flyers.editor.tool_center_v') }}</span>
					</button>
				</div>
			</div>

			<!-- Templates Panel -->
			<div
				class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1">
				<div class="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
					<h3
						class="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide">
						<Icon name="ph:stack-fill" class="text-brand-500" />
						{{ $t('flyers.editor.templates_title') }}
					</h3>
				</div>
				<div class="p-4 h-64 xl:h-auto overflow-y-auto custom-scrollbar space-y-3">
					<button v-for="template in templates" :key="template.id" @click="loadTemplate(template.id)"
						type="button" :disabled="loadingTemplate"
						:class="selectedBaseTemplate === template.id ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-500/20 dark:ring-brand-400' : 'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600'"
						class="w-full h-16 rounded-xl border border-slate-200 dark:border-slate-700 p-2 flex items-center gap-3 transition-all text-left">
						<!-- Preview Thumb -->
						<div
							class="h-12 w-12 rounded-lg bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 overflow-hidden shrink-0 flex items-center justify-center">
							<img v-if="template.image" :src="template.image" class="w-full h-full object-cover" />
							<Icon v-else :name="template.icon" size="20" class="text-slate-400"
								:class="{ 'text-brand-500': template.isSmart }" />
						</div>
						<div class="min-w-0">
							<p class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ template.name }}</p>
							<p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">{{ template.description
								}}</p>
						</div>
						<Icon v-if="selectedBaseTemplate === template.id" name="ph:check-circle-fill"
							class="ml-auto rtl:ml-0 rtl:mr-auto text-brand-500 shrink-0" />
					</button>
				</div>
			</div>
		</div>

		<!-- MAIN CANVAS AREA -->
		<div
			class="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden">

			<!-- TOP BAR: ACTIONS -->
			<div
				class="bg-white dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap-reverse items-center justify-between gap-4">
				<div v-if="mode === 'canvas'" class="flex items-center gap-2">
					<!-- Background Color -->
					<div
						class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600">
						<span class="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">{{ $t('flyers.editor.color_bg') }}</span>
						<input v-model="backgroundColor" type="color"
							class="w-6 h-6 rounded border-0 p-0 cursor-pointer bg-transparent" />
					</div>

					<!-- Text Color -->
					<div
						class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600">
						<span class="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">{{ $t('flyers.editor.color_text') }}</span>
						<input v-model="textColor" type="color"
							class="w-6 h-6 rounded border-0 p-0 cursor-pointer bg-transparent" />
					</div>

					<!-- Font Family -->
					<div
						class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600">
						<span class="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">Police</span>
						<select v-model="textFontFamily"
							class="text-xs bg-transparent border-0 outline-none cursor-pointer text-slate-700 dark:text-slate-200 max-w-[110px]">
							<option value="Luckiest Guy">Fun</option>
							<option value="Anton">Impact</option>
							<option value="Bangers">Comics</option>
							<option value="Righteous">Moderne</option>
						</select>
					</div>

					<!-- Text Alignment -->
					<div class="flex items-center bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600 overflow-hidden">
						<button @click="changeTextAlign('left')" type="button" title="Aligner à gauche"
							class="p-1.5 transition-colors"
							:class="textAlign === 'left' ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'">
							<Icon name="ph:text-align-left-bold" size="16" />
						</button>
						<button @click="changeTextAlign('center')" type="button" title="Centrer"
							class="p-1.5 transition-colors"
							:class="textAlign === 'center' ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'">
							<Icon name="ph:text-align-center-bold" size="16" />
						</button>
						<button @click="changeTextAlign('right')" type="button" title="Aligner à droite"
							class="p-1.5 transition-colors"
							:class="textAlign === 'right' ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'">
							<Icon name="ph:text-align-right-bold" size="16" />
						</button>
					</div>

					<div class="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

					<!-- Delete -->
					<button @click="deleteSelected" type="button" title="Supprimer la sélection"
						class="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
						<Icon name="ph:trash-bold" size="20" />
					</button>

					<!-- Clear -->
					<button @click="clearCanvas" type="button" title="Tout effacer"
						class="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
						<Icon name="ph:eraser-bold" size="20" />
					</button>
				</div>
				<div v-else class=""></div>				<div class="flex items-center gap-2">
					<!-- Preview (Test) Button -->
					<button @click="previewFlyer" type="button" :disabled="previewing"
						class="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
						<Icon v-if="previewing" name="ph:spinner-gap-bold" size="16" class="animate-spin" />
						<Icon v-else name="ph:eye-bold" size="16" />
						<span class="hidden sm:inline">{{ $t('flyers.editor.btn_preview') }}</span>
					</button>

					<!-- Download PNG -->
					<button @click="downloadFlyer" type="button"
						class="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
						<Icon name="ph:file-png-bold" size="16" />
						<span class="hidden sm:inline">PNG</span>
					</button>

					<!-- Download PDF -->
					<button @click="downloadFlyerPDF" type="button"
						class="px-3 py-2 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
						<Icon name="ph:file-pdf-bold" size="16" />
						<span class="hidden sm:inline">PDF</span>
					</button>

					<!-- Order Flyers -->
					<button @click="orderFlyers" type="button" :disabled="orderLoading"
						class="px-3 py-2 bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
						<Icon v-if="orderLoading" name="ph:spinner-gap-bold" size="16" class="animate-spin" />
						<Icon v-else name="ph:shopping-cart-bold" size="16" />
						<span class="hidden sm:inline">{{ orderLoading ? $t('flyers.editor.btn_ordering') : $t('flyers.editor.btn_order') }}</span>
					</button>

					<!-- Export / Save -->
					<button @click="exportFlyer" type="button" :disabled="exporting || saving"
						class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-70">
						<Icon v-if="exporting || saving" name="ph:spinner-gap-bold" size="16" class="animate-spin" />
						<Icon v-else name="ph:floppy-disk-bold" size="16" />
						{{ saving ? $t('flyers.editor.btn_saving') : exporting ? $t('flyers.editor.btn_saving') : $t('flyers.editor.btn_save') }}
					</button>
				</div>


			</div>

			<!-- CANVAS CONTAINER -->
			<div
				class="flex-1 flex items-center justify-center p-8 bg-[url('https://res.cloudinary.com/dts5p63s6/image/upload/v1727712392/grid-pattern_m4yq7j.svg')] bg-[length:24px_24px] overflow-auto">


				<div v-if="mode === 'smart'" class="flex flex-col items-center gap-6 py-6 w-full">
					<SmartFlyer ref="smartFlyerRef" :game="currentGame" :business-name="currentBusinessName"
						:business-logo="currentBusinessLogo" :qr-code-url="currentQrCodeUrl"
						:primary-color="smartOptions.backgroundColor" :accent-color="smartOptions.accentColor"
						:button-color="smartOptions.buttonColor" :font-family="smartOptions.fontFamily"
						:prizes="currentGame?.prizes" :conditions="smartOptions.conditions" />

					<!-- Floating Smart Controls (Moved to Bottom) -->
					<div
						class="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700 shadow-lg rounded-2xl p-2 flex items-center gap-4 animate-fade-in-up">
						<div
							class="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/80 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-xl">
							<Icon name="ph:magic-wand-bold" size="16" />
							<span class="text-xs font-bold uppercase tracking-wide">{{ $t('flyers.editor.smart_customize') }}</span>
						</div>

						<div class="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

						<!-- Controls -->
						<div class="flex items-center gap-3">
							<!-- Font Picker -->
							<div class="relative group" title="Police d'écriture">
								<select v-model="smartOptions.fontFamily"
									class="appearance-none pl-3 pr-8 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wide cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 dark:text-white">
									<option value="Luckiest Guy">Fun</option>
									<option value="Anton">Impact</option>
									<option value="Bangers">Comics</option>
									<option value="Righteous">Moderne</option>
								</select>
								<Icon name="ph:caret-down-bold" size="12"
									class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
							</div>

							<div class="h-6 w-px bg-slate-200"></div>

							<!-- Background Color -->
							<div class="relative group cursor-pointer" title="Couleur de fond">
								<div
									class="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors">
									<div
										class="w-6 h-6 rounded-full shadow-inner ring-1 ring-black/10 overflow-hidden relative">
										<input v-model="smartOptions.backgroundColor" type="color"
											class="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 p-0 border-0 cursor-pointer" />
										<div class="w-full h-full pointer-events-none"
											:style="{ backgroundColor: smartOptions.backgroundColor }"></div>
									</div>
									<span class="text-[10px] font-bold text-slate-500 uppercase">{{ $t('flyers.editor.smart_bg') }}</span>
								</div>
							</div>

							<!-- Accent Color -->
							<div class="relative group cursor-pointer" title="Couleur des textes">
								<div
									class="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors">
									<div
										class="w-6 h-6 rounded-full shadow-inner ring-1 ring-black/10 overflow-hidden relative">
										<input v-model="smartOptions.accentColor" type="color"
											class="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 p-0 border-0 cursor-pointer" />
										<div class="w-full h-full pointer-events-none"
											:style="{ backgroundColor: smartOptions.accentColor }"></div>
									</div>
									<span class="text-[10px] font-bold text-slate-500 uppercase">{{ $t('flyers.editor.smart_text') }}</span>
								</div>
							</div>

							<!-- Button Color -->
							<div class="relative group cursor-pointer" title="Couleur du bouton">
								<div
									class="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors">
									<div
										class="w-6 h-6 rounded-full shadow-inner ring-1 ring-black/10 overflow-hidden relative">
										<input v-model="smartOptions.buttonColor" type="color"
											class="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 p-0 border-0 cursor-pointer" />
										<div class="w-full h-full pointer-events-none"
											:style="{ backgroundColor: smartOptions.buttonColor }"></div>
									</div>
									<span class="text-[10px] font-bold text-slate-500 uppercase">{{ $t('flyers.editor.smart_button') }}</span>
								</div>
							</div>

							<!-- Conditions -->
							<div class="relative group" title="Mentions légales">
								<div class="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors">
									<Icon name="ph:scales-bold" size="16" class="text-slate-400" />
									<span class="text-[10px] font-bold text-slate-500 uppercase">{{ $t('flyers.editor.smart_conditions') }}</span>
								</div>
								<div class="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-3 hidden group-hover:block z-50">
									<textarea v-model="smartOptions.conditions" rows="3" placeholder="Ex: Jeu sans obligation d'achat. Voir conditions en magasin."
										class="w-full text-xs border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"></textarea>
								</div>
							</div>
						</div>
					</div>
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

		<!-- QR Code Customizer Modal -->
		<Teleport to="body">
			<Transition name="modal">
				<div v-if="showQRCodeModal"
					class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
					@click.self="closeQRCodeModal">
					<div
						class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
						<!-- Modal Header -->
						<div
							class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
							<div class="flex items-center gap-3">
								<div
									class="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
									<Icon name="ph:qr-code-bold" size="20" />
								</div>
								<div>
									<h2 class="text-lg font-bold text-slate-900 dark:text-white">Ajouter un QR Code</h2>
									<p class="text-xs text-slate-500 dark:text-slate-400">Personnalisez et ajoutez au flyer</p>
								</div>
							</div>
							<button @click="closeQRCodeModal"
								class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
								<Icon name="ph:x-bold" size="20" />
							</button>
						</div>

						<!-- Modal Content -->
						<div class="flex-1 overflow-y-auto p-6">
							<QRCodeCustomizer
								:game-url="getGameUrl()"
								:initial-color="game?.qrCodeColor || '#000000'"
								:initial-bg-color="game?.qrCodeBgColor || '#ffffff'"
								:initial-logo-url="game?.qrCodeLogoUrl || ''"
								@update="handleQRCodeUpdate"
								@save="handleQRCodeSave"
							/>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- Order Flyers Modal -->
		<OrdersCreateOrderModal v-model="showOrderModal" :flyer-design-url="orderFlyerDesignUrl" @created="handleOrderCreated" />
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
