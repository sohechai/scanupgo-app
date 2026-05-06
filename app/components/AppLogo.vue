<script setup lang="ts">
const props = withDefaults(defineProps<{
	variant?: 'light' | 'dark'
	size?: number
	iconOnly?: boolean
}>(), {
	variant: 'light',
	size: 32,
	iconOnly: false,
})

const squareBR = computed(() => props.variant === 'dark' ? '#1A55C0' : '#0E2F80')
const arrowStroke = computed(() => props.variant === 'dark' ? 'white' : '#0E2F80')
const textMain = computed(() => props.variant === 'dark' ? '#FFFFFF' : '#020917')
const textAccent = computed(() => props.variant === 'dark' ? '#80C0F8' : '#1A55C0')
const fontSize = computed(() => Math.round(props.size * 0.68))
const gap = computed(() => Math.round(props.size * 0.34))
</script>

<template>
	<div class="inline-flex items-center" :style="{ gap: `${gap}px` }">
		<svg :width="size" :height="size" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect x="4" y="4" width="40" height="40" rx="9" fill="#C8E6FF"/>
			<rect x="4" y="56" width="40" height="40" rx="9" fill="#3B8EE8"/>
			<rect x="56" y="56" width="40" height="40" rx="9" :fill="squareBR"/>
			<path d="M59 7 L93 7 L93 41" :stroke="arrowStroke" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
			<line x1="61" y1="39" x2="91" y2="9" :stroke="arrowStroke" stroke-width="9.5" stroke-linecap="round"/>
		</svg>
		<span
			v-if="!iconOnly"
			:style="{
				fontFamily: '\'Plus Jakarta Sans\', sans-serif',
				fontWeight: 800,
				fontSize: `${fontSize}px`,
				letterSpacing: '-0.035em',
				lineHeight: 1,
				userSelect: 'none',
				whiteSpace: 'nowrap',
			}"
		>
			<span :style="{ color: textMain }">Scan</span><span :style="{ color: textAccent }">Up</span><span :style="{ color: textMain }">Go</span>
		</span>
	</div>
</template>
