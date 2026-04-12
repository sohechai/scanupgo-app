<script setup lang="ts">
const props = defineProps<{
	modelValue?: string | null
	label?: string
	accept?: string
	maxSize?: number // in MB
	preview?: boolean
	uploadType?: 'logo' | 'background' | 'image' // Type of upload
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string | null]
}>()

const { $api } = useNuxtApp()
const { show: showToast } = useToast()
const { t } = useI18n()

const uploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()

const currentUrl = computed(() => props.modelValue || null)

const handleFileSelect = async (event: Event) => {
	const target = event.target as HTMLInputElement
	const file = target.files?.[0]

	if (!file) return

	// Validate file size
	const maxSizeBytes = (props.maxSize || 5) * 1024 * 1024
	if (file.size > maxSizeBytes) {
		error.value = t('components.file_upload.error_too_large', { size: props.maxSize || 5 })
		showToast(error.value, 'error')
		return
	}

	// Validate file type
	if (props.accept && !file.type.match(props.accept)) {
		error.value = t('components.file_upload.error_wrong_type')
		showToast(error.value, 'error')
		return
	}

	error.value = null
	uploading.value = true

	try {
		const formData = new FormData()
		formData.append('file', file)

		// Determine endpoint based on upload type
		const endpoint = props.uploadType ? `/uploads/${props.uploadType}` : '/uploads/image'

		const response = await $api<{ url: string }>(endpoint, {
			method: 'POST',
			body: formData
		})

		emit('update:modelValue', response.url)
		showToast(t('components.file_upload.success'), 'success')
	} catch (e: any) {
		console.error('Upload error:', e)
		error.value = e?.data?.message || t('components.file_upload.error_upload')
		showToast(error.value, 'error')
	} finally {
		uploading.value = false
	}
}

const triggerFileInput = () => {
	fileInput.value?.click()
}

const removeFile = () => {
	emit('update:modelValue', null)
	if (fileInput.value) {
		fileInput.value.value = ''
	}
}
</script>

<template>
	<div class="space-y-2">
		<label v-if="label" class="block text-sm font-bold text-slate-700">
			{{ label }}
		</label>

		<input
			ref="fileInput"
			type="file"
			:accept="accept || 'image/*'"
			@change="handleFileSelect"
			class="hidden"
		/>

		<!-- No file: drop zone -->
		<div
			v-if="!currentUrl"
			@click="triggerFileInput"
			class="group border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition-all duration-200"
			:class="{ 'opacity-50 pointer-events-none': uploading }"
		>
			<div class="flex flex-col items-center gap-3">
				<div class="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
					<Icon
						v-if="!uploading"
						name="ph:cloud-arrow-up-duotone"
						size="26"
						class="text-slate-400 group-hover:text-brand-500 transition-colors"
					/>
					<Icon
						v-else
						name="ph:spinner-gap-bold"
						size="26"
						class="text-brand-600 animate-spin"
					/>
				</div>
				<div>
					<p class="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
						{{ uploading ? $t('components.file_upload.uploading') : $t('components.file_upload.click_to_choose') }}
					</p>
					<p class="text-xs text-slate-400 mt-0.5">
						{{ accept ? accept.replace('image/', '').toUpperCase() : 'PNG, JPG, SVG' }} · Max {{ maxSize || 5 }}MB
					</p>
				</div>
			</div>
		</div>

		<!-- Has file: image preview with hover overlay -->
		<div v-else class="relative group w-full rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50" style="aspect-ratio: 16/7">
			<img :src="currentUrl" alt="Preview" class="w-full h-full object-contain p-4" />

			<!-- Overlay on hover -->
			<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
				<button
					@click.stop="triggerFileInput"
					type="button"
					:disabled="uploading"
					class="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors shadow-lg"
				>
					<Icon v-if="uploading" name="ph:spinner-gap-bold" class="animate-spin" size="16" />
					<Icon v-else name="ph:pencil-simple-bold" size="16" />
					{{ uploading ? $t('components.file_upload.uploading') : $t('components.file_upload.change') }}
				</button>
				<button
					@click.stop="removeFile"
					type="button"
					:disabled="uploading"
					class="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-lg"
				>
					<Icon name="ph:trash-bold" size="16" />
				</button>
			</div>
		</div>

		<!-- Error message -->
		<p v-if="error" class="text-sm text-red-600 font-medium">{{ error }}</p>
	</div>
</template>
