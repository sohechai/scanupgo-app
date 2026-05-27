<script setup lang="ts">
const props = defineProps<{ file: File }>()
const emit = defineEmits<{ confirm: [file: File]; cancel: [] }>()

const FRAME = 260

const canvasRef = ref<HTMLCanvasElement | null>(null)
const naturalW = ref(1)
const naturalH = ref(1)
// zoomPct: 0 = min zoom (image fills frame), 1 = max zoom (4×)
// Decoupled from reactive min/max to avoid browser range-clamp race on image load
const zoomPct = ref(0)
const offsetX = ref(0)
const offsetY = ref(0)

let blobUrl = ''
let loadedImg: HTMLImageElement | null = null

const minZoom = computed(() =>
	Math.max(FRAME / naturalW.value, FRAME / naturalH.value)
)

const zoom = computed(() => minZoom.value * (1 + zoomPct.value * 3))
const imgW = computed(() => naturalW.value * zoom.value)
const imgH = computed(() => naturalH.value * zoom.value)

const clampX = computed(() => {
	const max = Math.max(0, imgW.value / 2 - FRAME / 2)
	return Math.max(-max, Math.min(max, offsetX.value))
})
const clampY = computed(() => {
	const max = Math.max(0, imgH.value / 2 - FRAME / 2)
	return Math.max(-max, Math.min(max, offsetY.value))
})

const imgLeft = computed(() => FRAME / 2 + clampX.value - imgW.value / 2)
const imgTop  = computed(() => FRAME / 2 + clampY.value - imgH.value / 2)

// Draw to canvas
const draw = () => {
	const canvas = canvasRef.value
	if (!canvas || !loadedImg) return
	const ctx = canvas.getContext('2d')!
	ctx.clearRect(0, 0, FRAME, FRAME)
	// Background
	ctx.fillStyle = '#000'
	ctx.fillRect(0, 0, FRAME, FRAME)
	// Image
	ctx.drawImage(loadedImg, imgLeft.value, imgTop.value, imgW.value, imgH.value)
	// Rule of thirds grid
	ctx.strokeStyle = 'rgba(129,140,248,0.3)'
	ctx.lineWidth = 0.5
	for (let i = 1; i < 3; i++) {
		const x = (FRAME / 3) * i
		const y = (FRAME / 3) * i
		ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FRAME); ctx.stroke()
		ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FRAME, y); ctx.stroke()
	}
	// Corner handles — inset 1px so stroke stays inside canvas
	const h = 16
	const o = 1 // inset offset
	ctx.strokeStyle = '#818cf8'
	ctx.lineWidth = 2
	ctx.lineCap = 'square'
	const corners = [
		[o, o, 1, 1],
		[FRAME - o, o, -1, 1],
		[o, FRAME - o, 1, -1],
		[FRAME - o, FRAME - o, -1, -1],
	] as const
	for (const [cx, cy, dx, dy] of corners) {
		ctx.beginPath()
		ctx.moveTo(cx + dx * h, cy)
		ctx.lineTo(cx, cy)
		ctx.lineTo(cx, cy + dy * h)
		ctx.stroke()
	}
}

// rAF loop — always reads current reactive values, no Vue tracking issues
let rafId = 0
const renderLoop = () => {
	draw()
	rafId = requestAnimationFrame(renderLoop)
}

onMounted(() => {
	blobUrl = URL.createObjectURL(props.file)
	const img = new Image()
	img.onload = () => {
		loadedImg = img
		naturalW.value = img.naturalWidth || 1
		naturalH.value = img.naturalHeight || 1
		// zoomPct=0 → zoom = minZoom automatically, no slider init race
	}
	img.src = blobUrl
	renderLoop()
})

onUnmounted(() => {
	cancelAnimationFrame(rafId)
	if (blobUrl) URL.revokeObjectURL(blobUrl)
})

// Drag
const dragging = ref(false)
const drag = ref({ x: 0, y: 0, ox: 0, oy: 0 })

const onDown = (e: MouseEvent | TouchEvent) => {
	const pt = 'touches' in e ? e.touches[0] : e
	dragging.value = true
	drag.value = { x: pt.clientX, y: pt.clientY, ox: offsetX.value, oy: offsetY.value }
}
const onMove = (e: MouseEvent | TouchEvent) => {
	if (!dragging.value) return
	const pt = 'touches' in e ? e.touches[0] : e
	offsetX.value = drag.value.ox + (pt.clientX - drag.value.x)
	offsetY.value = drag.value.oy + (pt.clientY - drag.value.y)
}
const onUp = () => { dragging.value = false }

watch(zoomPct, () => {
	offsetX.value = clampX.value
	offsetY.value = clampY.value
})

// Export — same draw logic scaled to 600×600
const confirming = ref(false)
const handleConfirm = () => {
	if (!loadedImg) return
	confirming.value = true

	const SIZE = 600
	const scale = SIZE / FRAME
	const canvas = document.createElement('canvas')
	canvas.width  = SIZE
	canvas.height = SIZE
	const ctx = canvas.getContext('2d')!

	ctx.drawImage(
		loadedImg,
		imgLeft.value * scale,
		imgTop.value  * scale,
		imgW.value    * scale,
		imgH.value    * scale,
	)

	canvas.toBlob(blob => {
		if (!blob) { confirming.value = false; return }
		emit('confirm', new File([blob], props.file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' }))
		confirming.value = false
	}, 'image/png', 0.95)
}
</script>

<template>
	<Teleport to="body">
		<div class="fixed inset-0 z-[300] flex items-center justify-center p-4">
			<div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="emit('cancel')" />

			<div class="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
				<div class="h-0.5 w-full bg-indigo-500" />
				<div class="p-5">

					<div class="flex items-start gap-3 mb-4">
						<div class="w-9 h-9 rounded-md bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
							<Icon name="ph:crop-bold" size="18" class="text-indigo-500" />
						</div>
						<div>
							<h3 class="text-sm font-semibold text-slate-900 dark:text-white">Recadrer le logo</h3>
							<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Glissez l'image · curseur pour zoomer</p>
						</div>
					</div>

					<!-- Canvas crop area -->
					<div class="flex justify-center mb-3">
						<canvas
							ref="canvasRef"
							:width="FRAME"
							:height="FRAME"
							class="rounded-sm"
							:style="{ cursor: dragging ? 'grabbing' : 'grab', display: 'block' }"
							@mousedown="onDown"
							@mousemove="onMove"
							@mouseup="onUp"
							@mouseleave="onUp"
							@touchstart.passive="onDown"
							@touchmove.prevent="onMove"
							@touchend="onUp"
						/>
					</div>

					<!-- Zoom slider -->
					<div class="flex items-center gap-3 mb-4 px-1">
						<Icon name="ph:magnifying-glass-minus-bold" size="14" class="text-slate-400 shrink-0" />
						<input
							type="range"
							min="0"
							max="1"
							step="0.001"
							v-model.number="zoomPct"
							class="flex-1 accent-indigo-500 cursor-pointer"
						/>
						<Icon name="ph:magnifying-glass-plus-bold" size="14" class="text-slate-400 shrink-0" />
					</div>

					<div class="flex gap-2 justify-end">
						<button @click="emit('cancel')" type="button"
							class="px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
							Annuler
						</button>
						<button @click="handleConfirm" :disabled="confirming" type="button"
							class="px-3.5 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-md transition-colors shadow-sm flex items-center gap-1.5">
							<Icon v-if="confirming" name="ph:spinner-gap-bold" size="13" class="animate-spin" />
							Utiliser ce recadrage
						</button>
					</div>

				</div>
			</div>
		</div>
	</Teleport>
</template>
