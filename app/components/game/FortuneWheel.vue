<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
	prizes: any[]
	primaryColor: string
	targetPrizeIndex: number | null // If null, we don't know the winner yet
	isSpinning: boolean
	hasLost?: boolean // New prop to indicate if player lost
	previewMode?: boolean // Static display mode for intro page
	pointerPosition?: 'top' | 'right' // Pointer position
}>()

const emit = defineEmits(['spin-end'])

const canvasRef = ref<HTMLCanvasElement | null>(null)
const currentRotation = ref(-Math.PI / 16) // Slight rotation for a more natural resting position
const spinVelocity = ref(0)
const isDecelerating = ref(false)
const animationId = ref<number | null>(null)
const lightsAnimationId = ref<number | null>(null)
const lightPhase = ref(0) // For animating the lights
const giftImage = ref<HTMLImageElement | null>(null)

// Total number of segments (alternating lost/gift)
const TOTAL_SEGMENTS = 8

// Generate segments: alternating lost and gift (cadeau)
const wheelSegments = computed(() => {
	const segments: any[] = []

	for (let i = 0; i < TOTAL_SEGMENTS; i++) {
		if (i % 2 === 0) {
			// Lost segment (white)
			segments.push({
				type: 'lost',
				name: t('play.wheel.lost'),
				color: '#3f3f46', // Dark grey (zinc-700)
				textColor: '#ffffff' // White text
			})
		} else {
			// Gift/Prize segment
			const prizeIndex = Math.floor(i / 2)
			const prize = props.prizes[prizeIndex % props.prizes.length]
			segments.push({
				type: 'prize',
				name: prize?.name || t('play.wheel.gift'),
				data: prize,
				color: '#3f3f46', // Dark grey (zinc-700)
				textColor: '#ffffff', // White text
				hasGiftImage: true
			})
		}
	}

	return segments
})

onMounted(() => {
	// Load gift image first
	const img = new Image()
	img.src = '/images/game-gift-v2.png'
	img.onload = () => {
		giftImage.value = img
		drawWheel()
	}
	img.onerror = () => {
		// Still draw wheel even if image fails
		drawWheel()
	}

	// Draw wheel initially (without image)
	drawWheel()

	// Start idle animation loop (for gifts zoom, and optionally lights)
	startIdleAnimation()
})

onUnmounted(() => {
	if (animationId.value) cancelAnimationFrame(animationId.value)
	if (lightsAnimationId.value) cancelAnimationFrame(lightsAnimationId.value)
})

watch(() => props.prizes, drawWheel, { deep: true })
watch(wheelSegments, drawWheel, { deep: true })
watch(() => props.isSpinning, (newVal) => {
	if (newVal) {
		startSpin()
	}
})
watch(() => [props.targetPrizeIndex, props.hasLost], ([newIndex, hasLost]) => {
	if (props.isSpinning && !isDecelerating.value) {
		if (hasLost) {
			// Find a "lost" segment index
			const lostSegmentIndex = wheelSegments.value.findIndex(s => s.type === 'lost')
			if (lostSegmentIndex !== -1) {
				startDeceleration(lostSegmentIndex)
			}
		} else if (newIndex !== null) {
			// Find the actual segment index for this prize
			const prizeSegmentIndex = wheelSegments.value.findIndex(s =>
				s.type === 'prize' && s.data === props.prizes[newIndex as number]
			)
			if (prizeSegmentIndex !== -1) {
				startDeceleration(prizeSegmentIndex)
			}
		}
	}
}, { deep: true })

function startIdleAnimation() {
	const animate = () => {
		if (!props.previewMode) {
			lightPhase.value += 0.1
		}
		// Only redraw if not spinning fast (performance optimization)
		if (!props.isSpinning) {
			drawWheel()
		}
		lightsAnimationId.value = requestAnimationFrame(animate)
	}
	lightsAnimationId.value = requestAnimationFrame(animate)
}

function drawWheel() {
	const canvas = canvasRef.value
	if (!canvas) return
	const ctx = canvas.getContext('2d')
	if (!ctx) return

	const width = canvas.width
	const height = canvas.height
	const centerX = width / 2
	const centerY = height / 2
	
	// Leave enough padding for the very thick 28px outer rim (needs at least 14px)
	const wheelRadius = width / 2 - 20

	ctx.clearRect(0, 0, width, height)

	// --- Rotate Wheel Context ---
	ctx.save()
	ctx.translate(centerX, centerY)
	ctx.rotate(currentRotation.value)

	const numSegments = wheelSegments.value.length
	const anglePerSegment = (2 * Math.PI) / numSegments

	// --- 4. Draw Segments ---
	for (let i = 0; i < numSegments; i++) {
		const startAngle = i * anglePerSegment
		const endAngle = (i + 1) * anglePerSegment
		const segment = wheelSegments.value[i]

		ctx.beginPath()
		ctx.moveTo(0, 0)
		ctx.arc(0, 0, wheelRadius, startAngle, endAngle)
		ctx.closePath()

		// Fill segment
		ctx.fillStyle = segment.color
		ctx.fill()

		// Draw thick border
		ctx.lineWidth = 10
		ctx.strokeStyle = '#ffffff'
		ctx.stroke()

		// Draw content (text or image)
		ctx.save()
		const segmentAngle = startAngle + anglePerSegment / 2
		ctx.rotate(segmentAngle)

		if (segment.hasGiftImage && giftImage.value) {
			// Draw gift image for prize segments
			let imgSize = 130
			const imgDistance = wheelRadius * 0.65

			// Periodic quick zoom animation every 7 seconds (when not spinning)
			if (!props.isSpinning) {
				const cycle = Date.now() % 7000
				if (cycle < 600) {
					const progress = cycle / 600
					// Sine wave for smooth bounce up and down: max +25% scale
					imgSize *= 1 + Math.sin(progress * Math.PI) * 0.25
				}
			}

			ctx.save()
			ctx.translate(imgDistance, 0)
			// Rotate 90 degrees so the bottom faces the center
			ctx.rotate(Math.PI / 2)
			ctx.drawImage(giftImage.value, -imgSize / 2, -imgSize / 2, imgSize, imgSize)
			ctx.restore()
		} else {
			// Draw text for lost segments, reading from center outwards
			ctx.textAlign = 'left'
			ctx.textBaseline = 'middle'
			ctx.fillStyle = segment.textColor
			ctx.font = '900 36px "Montserrat", sans-serif'
			ctx.shadowBlur = 0
			ctx.shadowOffsetX = 0
			ctx.shadowOffsetY = 0

			ctx.save()
			ctx.translate(wheelRadius * 0.45, 0)
			ctx.fillText(segment.name, 0, 0)
			ctx.restore()
		}

		ctx.restore()
	}
	ctx.restore() // Restore from wheel rotation

	// --- 5. Draw Outer Rim ---
	ctx.beginPath()
	ctx.arc(centerX, centerY, wheelRadius, 0, 2 * Math.PI)
	ctx.lineWidth = 28
	ctx.strokeStyle = '#ffffff'
	ctx.stroke()

	// --- 6. Draw Center Hub ---
	const hubRadius = 45
	
	// Base circle with very subtle radial gradient for the "flat" middle
	ctx.beginPath()
	ctx.arc(centerX, centerY, hubRadius, 0, 2 * Math.PI)
	const goldGradient = ctx.createRadialGradient(centerX - 10, centerY - 10, 0, centerX, centerY, hubRadius)
	goldGradient.addColorStop(0, '#fef9c3') // Soft highlight
	goldGradient.addColorStop(0.5, '#fde047') // Flat light gold main area
	goldGradient.addColorStop(1, '#eab308') // Slight darkening at the very edge
	ctx.fillStyle = goldGradient
	ctx.fill()
	
	// Outer Bevel Rim
	ctx.beginPath()
	ctx.arc(centerX, centerY, hubRadius, 0, 2 * Math.PI)
	ctx.lineWidth = 4
	const rimGradientOut = ctx.createLinearGradient(centerX - hubRadius, centerY - hubRadius, centerX + hubRadius, centerY + hubRadius)
	rimGradientOut.addColorStop(0, '#fef9c3') // Light top-left
	rimGradientOut.addColorStop(0.5, '#f59e0b') // Mid gold
	rimGradientOut.addColorStop(1, '#92400e') // Dark bottom-right
	ctx.strokeStyle = rimGradientOut
	ctx.stroke()
	
	// Inner Bevel Rim
	ctx.beginPath()
	ctx.arc(centerX, centerY, hubRadius - 2, 0, 2 * Math.PI)
	ctx.lineWidth = 2
	const rimGradientIn = ctx.createLinearGradient(centerX - hubRadius, centerY - hubRadius, centerX + hubRadius, centerY + hubRadius)
	rimGradientIn.addColorStop(0, '#92400e') // Dark top-left
	rimGradientIn.addColorStop(0.5, '#f59e0b') // Mid gold
	rimGradientIn.addColorStop(1, '#fef9c3') // Light bottom-right
	ctx.strokeStyle = rimGradientIn
	ctx.stroke()
}

// Helper to lighten hex color (very basic implementation)
function lightenColor(color: string, percent: number) {
	if (!color.startsWith('#')) return color
	const num = parseInt(color.replace('#', ''), 16)
	const amt = Math.round(2.55 * percent)
	const R = (num >> 16) + amt
	const B = ((num >> 8) & 0x00FF) + amt
	const G = (num & 0x0000FF) + amt
	
	return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1)
}

function startSpin() {
	spinVelocity.value = 0.3 // Faster initial velocity
	isDecelerating.value = false
	currentRotation.value = 0

	const animate = () => {
		// Update lights phase slightly faster during spin
		lightPhase.value += 0.5
		
		currentRotation.value += spinVelocity.value

		if (currentRotation.value >= 2 * Math.PI) {
			currentRotation.value -= 2 * Math.PI
		}

		drawWheel()

		if (props.isSpinning) {
			animationId.value = requestAnimationFrame(animate)
		}
	}
	animationId.value = requestAnimationFrame(animate)
}

function startDeceleration(targetIndex: number) {
	if (isDecelerating.value) return
	isDecelerating.value = true

	if (animationId.value) cancelAnimationFrame(animationId.value)

	const numSegments = wheelSegments.value.length
	const anglePerSegment = (2 * Math.PI) / numSegments

	const segmentCenter = targetIndex * anglePerSegment + anglePerSegment / 2
	const pointerAngle = props.pointerPosition === 'right' ? 0 : (3 * Math.PI) / 2

	let targetRotation = pointerAngle - segmentCenter

	while (targetRotation < 0) targetRotation += 2 * Math.PI

	const extraRounds = 5
	const startRot = currentRotation.value

	let delta = targetRotation - (startRot % (2 * Math.PI))
	if (delta < 0) delta += 2 * Math.PI

	const finalDestination = startRot + (extraRounds * 2 * Math.PI) + delta

	const duration = 5000 // Longer suspense
	const startTime = performance.now()

	const animateDecel = (time: number) => {
		lightPhase.value += 0.2 // Slow down lights too
		
		const elapsed = time - startTime
		const progress = Math.min(elapsed / duration, 1)

		// Custom easing: easeOutCubic
		const ease = 1 - Math.pow(1 - progress, 3)

		currentRotation.value = startRot + (finalDestination - startRot) * ease
		drawWheel()

		if (progress < 1) {
			requestAnimationFrame(animateDecel)
		} else {
			emit('spin-end')
		}
	}
	requestAnimationFrame(animateDecel)
}
</script>

<template>
	<div class="relative w-full aspect-square mx-auto filter">
		<!-- Canvas Wheel -->
		<canvas
			ref="canvasRef"
			width="800"
			height="800"
			class="w-full h-full transform"
		></canvas>

		<!-- Improved Pointer (User's SVG Map Pin with Gold Effect) -->
		<div class="absolute z-20 pointer-container"
			:class="pointerPosition === 'right' ? 'top-1/2 -right-[26px] -translate-y-1/2 rotate-90' : '-top-[50px] left-1/2 -translate-x-1/2'">
			<div class="relative drop-shadow-xl" :class="{ 'animate-wobble': isSpinning }">
                <svg width="32" height="45" viewBox="0 0 80 115" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <!-- Smooth light gold gradient -->
                        <linearGradient id="goldArrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#fef9c3" />
                            <stop offset="50%" stop-color="#fde047" />
                            <stop offset="100%" stop-color="#eab308" />
                        </linearGradient>
                    </defs>
                    <g>
                        <path fill="url(#goldArrowGradient)" d="M40,0C17.9,0,0,17.7,0,39.4S40,115,40,115s40-53.9,40-75.6S62.1,0,40,0z M40,52.5c-7,0-12.6-5.6-12.6-12.4 S33,27.7,40,27.7s12.6,5.6,12.6,12.4C52.6,46.9,47,52.5,40,52.5z"></path>
                        <path fill="rgba(0, 0, 0, 0.3)" d="M40,19.2c-11.7,0-21.2,9.3-21.2,20.8S28.3,60.8,40,60.8S61.2,51.5,61.2,40S51.7,19.2,40,19.2z M40,52.5 c-7,0-12.6-5.6-12.6-12.4S33,27.7,40,27.7s12.6,5.6,12.6,12.4C52.6,46.9,47,52.5,40,52.5z"></path>
                    </g>
                </svg>
			</div>
		</div>

		<!-- Confetti effect when spinning -->
		<div v-if="isSpinning" class="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
			<div class="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping" style="top: 20%; left: 30%;"></div>
			<div class="absolute w-2 h-2 bg-pink-400 rounded-full animate-ping" style="top: 70%; right: 20%; animation-delay: 0.2s;"></div>
		</div>
	</div>
</template>

<style scoped>
.animate-wobble {
	animation: wobble 0.1s ease-in-out infinite;
	transform-origin: top center;
}

@keyframes wobble {
	0%, 100% { transform: rotate(-5deg); }
	50% { transform: rotate(5deg); }
}
</style>
