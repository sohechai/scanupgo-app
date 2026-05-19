<script setup lang="ts">
const props = defineProps<{
	hasLogo: boolean
	hasQrCode: boolean
	uploading: boolean
	loadingTemplate: boolean
	selectedTemplate: string
	templates: any[]
}>()

const emit = defineEmits<{
	'add-text': []
	'add-logo': []
	'add-qr-code': []
	'center-horizontally': []
	'center-vertically': []
	'load-template': [id: string]
	'image-file-selected': [file: File]
}>()

const { t } = useI18n()
const fileInputRef = ref<HTMLInputElement>()

const triggerImageUpload = () => fileInputRef.value?.click()

const onFileChange = (event: Event) => {
	const file = (event.target as HTMLInputElement).files?.[0]
	if (file) emit('image-file-selected', file)
	;(event.target as HTMLInputElement).value = ''
}
</script>

<template>
	<div class="w-full xl:w-72 flex flex-col gap-6 shrink-0">

		<!-- Tools Panel -->
		<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
			<div class="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
				<h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide">
					<Icon name="ph:toolbox-fill" class="text-brand-500" />
					{{ t('flyers.editor.tools_title') }}
				</h3>
			</div>
			<div class="p-3 grid grid-cols-2 gap-2">

				<button @click="emit('add-text')" type="button"
					class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group">
					<div class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon name="ph:text-t-bold" size="20" />
					</div>
					<span class="text-xs font-bold">{{ t('flyers.editor.tool_text') }}</span>
				</button>

				<button @click="emit('add-logo')" type="button" :disabled="!hasLogo"
					class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group disabled:opacity-50 disabled:grayscale">
					<div class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon name="ph:image-square-bold" size="20" />
					</div>
					<span class="text-xs font-bold">{{ t('flyers.editor.tool_logo') }}</span>
				</button>

				<button @click="emit('add-qr-code')" type="button" :disabled="!hasQrCode"
					class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group disabled:opacity-50 disabled:grayscale">
					<div class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon name="ph:qr-code-bold" size="20" />
					</div>
					<span class="text-xs font-bold">QR Code</span>
				</button>

				<button @click="triggerImageUpload" type="button" :disabled="uploading"
					class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group disabled:opacity-50">
					<div class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon v-if="uploading" name="ph:spinner-gap-bold" size="20" class="animate-spin" />
						<Icon v-else name="ph:upload-simple-bold" size="20" />
					</div>
					<span class="text-xs font-bold">{{ t('flyers.editor.tool_image') }}</span>
				</button>
				<input type="file" ref="fileInputRef" @change="onFileChange" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" />

				<button @click="emit('center-horizontally')" type="button"
					class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group">
					<div class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon name="ph:align-center-horizontal-bold" size="20" />
					</div>
					<span class="text-xs font-bold">{{ t('flyers.editor.tool_center_h') }}</span>
				</button>

				<button @click="emit('center-vertically')" type="button"
					class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group">
					<div class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon name="ph:align-center-vertical-bold" size="20" />
					</div>
					<span class="text-xs font-bold">{{ t('flyers.editor.tool_center_v') }}</span>
				</button>

			</div>
		</div>

		<!-- Templates Panel -->
		<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1">
			<div class="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
				<h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide">
					<Icon name="ph:stack-fill" class="text-brand-500" />
					{{ t('flyers.editor.templates_title') }}
				</h3>
			</div>
			<div class="p-4 h-64 xl:h-auto overflow-y-auto custom-scrollbar space-y-3">
				<button v-for="template in templates" :key="template.id"
					@click="emit('load-template', template.id)"
					type="button" :disabled="loadingTemplate"
					:class="selectedTemplate === template.id ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-500/20 dark:ring-brand-400' : 'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600'"
					class="w-full h-16 rounded-xl border border-slate-200 dark:border-slate-700 p-2 flex items-center gap-3 transition-all text-left">
					<div class="h-12 w-12 rounded-lg bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 overflow-hidden shrink-0 flex items-center justify-center">
						<img v-if="template.image" :src="template.image" class="w-full h-full object-cover" />
						<Icon v-else :name="template.icon" size="20" class="text-slate-400" :class="{ 'text-brand-500': template.isSmart }" />
					</div>
					<div class="min-w-0">
						<p class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ template.name }}</p>
						<p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">{{ template.description }}</p>
					</div>
					<Icon v-if="selectedTemplate === template.id" name="ph:check-circle-fill" class="ml-auto rtl:ml-0 rtl:mr-auto text-brand-500 shrink-0" />
				</button>
			</div>
		</div>

	</div>
</template>
