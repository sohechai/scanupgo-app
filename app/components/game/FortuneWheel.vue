<script setup lang="ts">
const props = defineProps<{
	prizes: any[]
	primaryColor: string
	targetPrizeIndex: number | null // If null, we don't know the winner yet
	isSpinning: boolean
	hasLost?: boolean // New prop to indicate if player lost
	previewMode?: boolean // Static display mode for intro page
}>()

const emit = defineEmits(['spin-end'])

const canvasRef = ref<HTMLCanvasElement | null>(null)
const currentRotation = ref(0)
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
			// Lost segment (dark)
			segments.push({
				type: 'lost',
				name: 'PERDU',
				color: '#1e293b', // Dark slate
				textColor: '#94a3b8' // Light gray text
			})
		} else {
			// Gift/Prize segment (cream/beige)
			// Map to actual prize if available
			const prizeIndex = Math.floor(i / 2)
			const prize = props.prizes[prizeIndex % props.prizes.length]
			segments.push({
				type: 'prize',
				name: prize?.name || 'Cadeau',
				data: prize,
				color: '#fef3c7', // Amber-100 (warm cream)
				textColor: '#92400e', // Amber-800
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

	// Don't animate lights in preview mode
	if (!props.previewMode) {
		startLightsAnimation()
	}
})

onUnmounted(() => {
	if (animationId.value) cancelAnimationFrame(animationId.value)
	if (lightsAnimationId.value) cancelAnimationFrame(lightsAnimationId.value)
})

watch(() => props.prizes, drawWheel, { deep: true })
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

function startLightsAnimation() {
	const animate = () => {
		lightPhase.value += 0.1
		// Only redraw if not spinning fast (performance optimization)
		// Or if spinning, we include light drawing in the main loop, but here we keep it separate visually or merged
		// Actually, let's just make the lights animate via CSS or redraw.
		// Since we redraw the whole canvas on spin, this is only needed when NOT spinning.
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
	
	// Config
	const wheelRadius = width / 2 - 10

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

		// Solid vibrant color (no gradient for cleaner look)
		ctx.fillStyle = segment.color
		ctx.fill()

		// Segment Border - white for separation
		ctx.strokeStyle = '#475569'
		ctx.lineWidth = 2
		ctx.stroke()

		// Draw content (text or image)
		ctx.save()
		const segmentAngle = startAngle + anglePerSegment / 2
		ctx.rotate(segmentAngle)

		if (segment.hasGiftImage && giftImage.value) {
			// Draw gift image for prize segments - counter-rotate to keep upright
			const imgSize = 80
			const imgDistance = wheelRadius * 0.68

			ctx.save()
			ctx.translate(imgDistance, 0)
			// Counter-rotate by the total rotation (wheel rotation + segment angle)
			ctx.rotate(-(currentRotation.value + segmentAngle))
			ctx.drawImage(giftImage.value, -imgSize / 2, -imgSize / 2, imgSize, imgSize)
			ctx.restore()
		} else {
			// Draw text for lost segments
			ctx.textAlign = 'right'
			ctx.fillStyle = segment.textColor
			ctx.font = 'bold 24px Arial'
			ctx.shadowBlur = 0
			ctx.shadowOffsetX = 0
			ctx.shadowOffsetY = 0

			// Rotate text to be readable
			ctx.save()
			ctx.translate(wheelRadius * 0.6, 0)
			ctx.rotate(Math.PI / 2)
			ctx.textAlign = 'center'
			ctx.fillText(segment.name, 0, 0)
			ctx.restore()
		}

		ctx.restore()
	}
	ctx.restore() // Restore from wheel rotation

	// --- 5. Draw Center Hub ---
	// Outer gold ring
	const hubRadius = 50
	ctx.beginPath()
	ctx.arc(centerX, centerY, hubRadius, 0, 2 * Math.PI)
	const goldGradient = ctx.createRadialGradient(centerX - 10, centerY - 10, 0, centerX, centerY, hubRadius)
	goldGradient.addColorStop(0, '#fef08a') // yellow-200
	goldGradient.addColorStop(0.5, '#eab308') // yellow-500
	goldGradient.addColorStop(1, '#ca8a04') // yellow-600
	ctx.fillStyle = goldGradient
	ctx.fill()
	ctx.strokeStyle = '#854d0e' // yellow-800
	ctx.lineWidth = 3
	ctx.stroke()

	// Inner circle with primary color
	const innerHubRadius = 38
	ctx.beginPath()
	ctx.arc(centerX, centerY, innerHubRadius, 0, 2 * Math.PI)
	ctx.fillStyle = props.primaryColor
	ctx.fill()
	ctx.strokeStyle = '#ffffff'
	ctx.lineWidth = 2
	ctx.stroke()

	// Center icon/emoji
	ctx.font = 'bold 28px Arial'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.fillStyle = '#ffffff'
	ctx.shadowColor = 'rgba(0,0,0,0.3)'
	ctx.shadowBlur = 4
	ctx.fillText('🎁', centerX, centerY)
	ctx.shadowBlur = 0
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
	const pointerAngle = (3 * Math.PI) / 2

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
	<div class="relative w-[320px] h-[320px] md:w-[480px] md:h-[480px] mx-auto filter drop-shadow-2xl">
		<!-- Canvas Wheel -->
		<canvas
			ref="canvasRef"
			width="800"
			height="800"
			class="w-full h-full transform"
		></canvas>

		<!-- Improved Pointer -->
		<div class="absolute -top-6 left-1/2 -translate-x-1/2 z-20 pointer-container">
			<div class="relative drop-shadow-lg" :class="{ 'animate-wobble': isSpinning }">
				<svg width="60" height="70" viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg">
					<!-- Metal Cap -->
					<circle cx="30" cy="15" r="10" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
					<!-- Tick -->
					<path d="M30 65L15 20H45L30 65Z" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
					<path d="M30 65L20 20H40L30 65Z" fill="url(#shine)" opacity="0.4"/>
					<defs>
						<linearGradient id="shine" x1="15" y1="20" x2="45" y2="20" gradientUnits="userSpaceOnUse">
							<stop stop-color="white"/>
							<stop offset="1" stop-color="white" stop-opacity="0"/>
						</linearGradient>
					</defs>
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

