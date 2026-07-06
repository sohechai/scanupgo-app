<script setup lang="ts">
// Petit badge de croissance +X% / -X% affiché à côté d'un KPI du dashboard.
// N'affiche RIEN si la valeur est null/undefined (pas de base de comparaison).
const props = defineProps<{ value?: number | null }>()

const show = computed(() => props.value != null && Number.isFinite(props.value))
const isPositive = computed(() => (props.value ?? 0) >= 0)
const label = computed(() => `${isPositive.value ? '+' : ''}${props.value}%`)
</script>

<template>
	<span v-if="show"
		class="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
		:class="isPositive
			? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10'
			: 'text-red-500 bg-red-50 dark:bg-red-500/10'">
		{{ label }}
	</span>
</template>
