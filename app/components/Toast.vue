<script setup lang="ts">
const { toasts, remove } = useToast()

const getIcon = (type: string) => {
	switch (type) {
		case 'success': return 'ph:check-circle-fill'
		case 'error': return 'ph:x-circle-fill'
		case 'info': return 'ph:info-fill'
		default: return 'ph:info-fill'
	}
}

const getColors = (type: string) => {
	switch (type) {
		case 'success': return 'bg-emerald-500 text-white'
		case 'error': return 'bg-red-500 text-white'
		case 'info': return 'bg-blue-500 text-white'
		default: return 'bg-slate-500 text-white'
	}
}
</script>

<template>
	<div class="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
		<TransitionGroup name="toast">
			<div v-for="toast in toasts" :key="toast.id"
				:class="[getColors(toast.type), 'pointer-events-auto px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[300px] max-w-md']">
				<Icon :name="getIcon(toast.type)" size="20" />
				<p class="text-sm font-bold flex-1">{{ toast.message }}</p>
				<button @click="remove(toast.id)" class="hover:opacity-75 transition-opacity">
					<Icon name="ph:x-bold" size="16" />
				</button>
			</div>
		</TransitionGroup>
	</div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
	transition: all 0.3s ease;
}

.toast-enter-from {
	opacity: 0;
	transform: translateX(100px);
}

.toast-leave-to {
	opacity: 0;
	transform: translateX(100px);
}
</style>
