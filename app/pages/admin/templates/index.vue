<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

const { t } = useI18n()

useHead({
	title: t('admin.templates.title')
})

const { $api } = useNuxtApp()

const loading = ref(true)
const templates = ref<any[]>([])

// Modal state
const showModal = ref(false)
const editingTemplate = ref<any>(null)
const modalForm = ref({ name: '', description: '', imageUrl: '' })
const uploading = ref(false)
const saving = ref(false)

// Delete confirmation
const showDeleteModal = ref(false)
const deletingTemplate = ref<any>(null)
const deleting = ref(false)

// Preview
const previewTemplate = ref<any>(null)

// Computed stats
const activeCount = computed(() => templates.value.filter(t => t.active).length)
const inactiveCount = computed(() => templates.value.filter(t => !t.active).length)

const fetchTemplates = async () => {
	loading.value = true
	try {
		templates.value = await $api<any[]>('/admin/templates')
	} catch (error) {
		console.error('Failed to fetch templates:', error)
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	fetchTemplates()
})

// Open modal for create
const openCreateModal = () => {
	editingTemplate.value = null
	modalForm.value = { name: '', description: '', imageUrl: '' }
	showModal.value = true
}

// Open modal for edit
const openEditModal = (template: any) => {
	editingTemplate.value = template
	modalForm.value = {
		name: template.name,
		description: template.description || '',
		imageUrl: template.imageUrl,
	}
	showModal.value = true
}

// Upload image
const handleFileUpload = async (event: Event) => {
	const input = event.target as HTMLInputElement
	if (!input.files?.length) return

	uploading.value = true
	try {
		const formData = new FormData()
		formData.append('file', input.files[0])
		const response = await $api<{ url: string }>('/uploads', {
			method: 'POST',
			body: formData,
		})
		modalForm.value.imageUrl = response.url
	} catch (error) {
		console.error('Upload failed:', error)
	} finally {
		uploading.value = false
	}
}

// Save (create or update)
const saveTemplate = async () => {
	if (!modalForm.value.name || !modalForm.value.imageUrl) return

	saving.value = true
	try {
		if (editingTemplate.value) {
			await $api(`/admin/templates/${editingTemplate.value.id}`, {
				method: 'PUT',
				body: modalForm.value,
			})
		} else {
			await $api('/admin/templates', {
				method: 'POST',
				body: modalForm.value,
			})
		}
		showModal.value = false
		await fetchTemplates()
	} catch (error) {
		console.error('Save failed:', error)
	} finally {
		saving.value = false
	}
}

// Delete
const confirmDelete = (template: any) => {
	deletingTemplate.value = template
	showDeleteModal.value = true
}

const deleteTemplate = async () => {
	if (!deletingTemplate.value) return

	deleting.value = true
	try {
		await $api(`/admin/templates/${deletingTemplate.value.id}`, {
			method: 'DELETE',
		})
		showDeleteModal.value = false
		await fetchTemplates()
	} catch (error) {
		console.error('Delete failed:', error)
	} finally {
		deleting.value = false
	}
}

// Toggle active
const toggleActive = async (template: any) => {
	try {
		await $api(`/admin/templates/${template.id}`, {
			method: 'PUT',
			body: { active: !template.active },
		})
		await fetchTemplates()
	} catch (error) {
		console.error('Toggle failed:', error)
	}
}
</script>

<template>
	<div class="relative min-h-screen">
		<!-- Background Elements -->
		<div class="fixed inset-0 pointer-events-none z-0">
			<div
				class="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-500/20 rounded-full blur-[120px] opacity-30 mix-blend-screen animate-pulse-slow">
			</div>
			<div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] opacity-30 mix-blend-screen animate-pulse-slow"
				style="animation-delay: 2s;"></div>
		</div>

		<div class="relative z-10 space-y-8 pb-10">
			<!-- Header -->
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1
						class="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
						{{ $t('admin.templates.title') }}</h1>
					<p class="text-slate-400 text-lg">{{ $t('admin.templates.description') }}</p>
				</div>
				<button @click="openCreateModal"
					class="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-500 hover:to-blue-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 text-sm shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 hover:-translate-y-0.5">
					<Icon name="ph:plus-bold" />
					{{ $t('admin.templates.add_button') }}
				</button>
			</div>

			<!-- Stats -->
			<div v-if="!loading && templates.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center gap-4">
					<div
						class="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
						<Icon name="ph:images-duotone" class="text-brand-400" size="24" />
					</div>
					<div>
						<div class="text-sm text-slate-400">{{ $t('admin.templates.stats_total') }}</div>
						<div class="text-2xl font-bold text-white">{{ templates.length }}</div>
					</div>
				</div>
				<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center gap-4">
					<div
						class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
						<Icon name="ph:check-circle-duotone" class="text-emerald-400" size="24" />
					</div>
					<div>
						<div class="text-sm text-slate-400">{{ $t('admin.templates.stats_active') }}</div>
						<div class="text-2xl font-bold text-emerald-400">{{ activeCount }}</div>
					</div>
				</div>
				<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center gap-4">
					<div
						class="w-12 h-12 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
						<Icon name="ph:eye-slash-duotone" class="text-slate-400" size="24" />
					</div>
					<div>
						<div class="text-sm text-slate-400">{{ $t('admin.templates.stats_inactive') }}</div>
						<div class="text-2xl font-bold text-slate-300">{{ inactiveCount }}</div>
					</div>
				</div>
			</div>

			<!-- Loading Skeleton -->
			<div v-if="loading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
				<div v-for="i in 5" :key="i"
					class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden animate-pulse">
					<div class="aspect-[3/4] bg-white/10"></div>
					<div class="p-4 space-y-2">
						<div class="h-4 bg-white/10 rounded w-24"></div>
						<div class="h-3 bg-white/10 rounded w-36"></div>
					</div>
				</div>
			</div>

			<!-- Templates Grid -->
			<div v-else-if="templates.length > 0"
				class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
				<div v-for="template in templates" :key="template.id"
					class="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/10 transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1"
					:class="{ 'opacity-60 grayscale-[50%]': !template.active }">

					<!-- Image -->
					<div class="relative aspect-[3/4] bg-slate-800 overflow-hidden cursor-pointer"
						@click="previewTemplate = template">
						<img :src="template.imageUrl" :alt="template.name"
							class="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />

						<!-- Hover overlay with actions -->
						<div
							class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
							<div class="flex gap-2">
								<button @click.stop="openEditModal(template)"
									class="flex-1 px-3 py-2 bg-white/90 hover:bg-white text-black rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5">
									<Icon name="ph:pencil-simple-bold" size="14" />
									{{ $t('admin.templates.edit_modal') }}
								</button>
								<button @click.stop="confirmDelete(template)"
									class="px-3 py-2 bg-red-500/90 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center">
									<Icon name="ph:trash-bold" size="14" />
								</button>
							</div>
						</div>

						<!-- Sort order badge -->
						<div
							class="absolute top-2.5 left-2.5 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white text-[11px] font-bold">
							#{{ template.sortOrder }}
						</div>

						<!-- Status badge -->
						<div class="absolute top-2.5 right-2.5">
							<button @click.stop="toggleActive(template)" :class="[
								'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 backdrop-blur-sm border',
								template.active
									? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
									: 'bg-black/40 text-slate-400 border-white/10 hover:bg-black/60'
							]">
								<div class="w-1.5 h-1.5 rounded-full"
									:class="template.active ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-slate-500'">
								</div>
								{{ template.active ? $t('admin.templates.active') : $t('admin.templates.inactive') }}
							</button>
						</div>
					</div>

					<!-- Info -->
					<div class="p-4">
						<h3 class="font-bold text-white text-sm mb-0.5 truncate">{{ template.name }}</h3>
						<p v-if="template.description" class="text-xs text-slate-500 truncate">{{ template.description
							}}</p>
						<p v-else class="text-xs text-slate-600 italic">{{ $t('admin.templates.no_description') }}</p>
					</div>
				</div>

				<!-- Add new card -->
				<button @click="openCreateModal"
					class="group/add aspect-[3/4] bg-white/[0.02] border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:border-brand-500/30 hover:bg-brand-500/5 cursor-pointer">
					<div
						class="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover/add:bg-brand-500/10 group-hover/add:border-brand-500/20 transition-all">
						<Icon name="ph:plus-bold" class="text-slate-500 group-hover/add:text-brand-400 transition-colors"
							size="24" />
					</div>
					<span
						class="text-sm font-medium text-slate-500 group-hover/add:text-slate-300 transition-colors">{{ $t('admin.templates.add_button') }}</span>
				</button>
			</div>

			<!-- Empty State -->
			<div v-else class="flex flex-col items-center justify-center py-20">
				<div
					class="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
					<Icon name="ph:images-duotone" size="40" class="text-slate-600" />
				</div>
				<h3 class="text-lg font-bold text-white mb-2">{{ $t('admin.templates.no_templates') }}</h3>
				<p class="text-slate-500 text-sm mb-6 text-center max-w-sm">{{ $t('admin.templates.no_templates_description') }}</p>
				<button @click="openCreateModal"
					class="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-500 hover:to-blue-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 text-sm shadow-lg shadow-brand-500/20">
					<Icon name="ph:plus-bold" />
					{{ $t('admin.templates.add_first') }}
				</button>
			</div>

			<!-- Create/Edit Modal -->
			<Teleport to="body">
				<div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
					<div
						class="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
						<div class="p-6 border-b border-white/10 flex items-center justify-between">
							<h2 class="text-xl font-bold text-white">
								{{ editingTemplate ? $t('admin.templates.modal_edit_title') : $t('admin.templates.modal_add_title') }}
							</h2>
							<button @click="showModal = false"
								class="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
								<Icon name="ph:x-bold" size="18" />
							</button>
						</div>

						<div class="p-6 space-y-5">
							<!-- Name -->
							<div>
								<label class="block text-sm font-medium text-slate-300 mb-1.5">{{ $t('admin.templates.modal_name_label') }}</label>
								<input v-model="modalForm.name" type="text" :placeholder="$t('admin.templates.modal_name_placeholder')"
									class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 outline-none appearance-none transition-all focus:bg-white/10" />
							</div>

							<!-- Description -->
							<div>
								<label class="block text-sm font-medium text-slate-300 mb-1.5">{{ $t('admin.templates.modal_description_label') }}
									<span class="text-slate-600 font-normal">{{ $t('admin.templates.modal_description_optional') }}</span>
								</label>
								<input v-model="modalForm.description" type="text"
									:placeholder="$t('admin.templates.modal_description_placeholder')"
									class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 outline-none appearance-none transition-all focus:bg-white/10" />
							</div>

							<!-- Image Upload -->
							<div>
								<label class="block text-sm font-medium text-slate-300 mb-1.5">{{ $t('admin.templates.modal_image_label') }}</label>
								<div v-if="modalForm.imageUrl"
									class="mb-3 rounded-xl overflow-hidden border border-white/10 bg-white/5 relative group/img">
									<img :src="modalForm.imageUrl"
										class="w-full h-52 object-cover object-top" />
									<label
										class="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
										<div class="flex items-center gap-2 text-white font-medium text-sm">
											<Icon name="ph:swap-bold" size="18" />
											{{ $t('admin.templates.modal_image_change') }}
										</div>
										<input type="file" accept="image/*" class="hidden"
											@change="handleFileUpload" />
									</label>
								</div>
								<label v-if="!modalForm.imageUrl || uploading"
									class="flex flex-col items-center justify-center gap-3 px-4 py-10 bg-white/[0.02] border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all group/upload"
									:class="{ 'opacity-50 pointer-events-none': uploading }">
									<div
										class="w-14 h-14 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center group-hover/upload:scale-110 group-hover/upload:border-brand-500/30 transition-all">
										<Icon v-if="uploading" name="ph:spinner" class="animate-spin text-white"
											size="24" />
										<Icon v-else name="ph:cloud-arrow-up-bold"
											class="text-slate-400 group-hover/upload:text-brand-400 transition-colors"
											size="24" />
									</div>
									<div class="text-center">
										<span
											class="block text-sm font-medium text-slate-300 group-hover/upload:text-white transition-colors">
											{{ uploading ? $t('admin.templates.modal_uploading') : $t('admin.templates.modal_image_upload_text') }}
										</span>
										<span v-if="!uploading" class="block text-xs text-slate-600 mt-1">{{ $t('admin.templates.modal_image_upload_hint') }}</span>
									</div>
									<input type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
								</label>
							</div>
						</div>

						<div class="p-6 border-t border-white/10 flex gap-3 justify-end">
							<button @click="showModal = false"
								class="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-300 font-medium transition-all">
								{{ $t('admin.templates.modal_cancel') }}
							</button>
							<button @click="saveTemplate"
								:disabled="!modalForm.name || !modalForm.imageUrl || saving" :class="[
									'px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2',
									(!modalForm.name || !modalForm.imageUrl || saving)
										? 'bg-white/10 text-slate-500 cursor-not-allowed'
										: 'bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-500 hover:to-blue-500 text-white shadow-lg shadow-brand-500/20'
								]">
								<Icon v-if="saving" name="ph:spinner" class="animate-spin" size="16" />
								{{ editingTemplate ? $t('admin.templates.modal_save') : $t('admin.templates.modal_create') }}
							</button>
						</div>
					</div>
				</div>
			</Teleport>

			<!-- Image Preview Modal -->
			<Teleport to="body">
				<div v-if="previewTemplate" class="fixed inset-0 z-50 flex items-center justify-center p-4"
					@click="previewTemplate = null">
					<div class="absolute inset-0 bg-black/80 backdrop-blur-md"></div>
					<div class="relative max-w-md w-full max-h-[85vh]" @click.stop>
						<img :src="previewTemplate.imageUrl" :alt="previewTemplate.name"
							class="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
						<div class="absolute -bottom-14 left-0 right-0 text-center">
							<h3 class="text-white font-bold text-lg">{{ previewTemplate.name }}</h3>
							<p v-if="previewTemplate.description" class="text-slate-400 text-sm">{{
								previewTemplate.description }}</p>
						</div>
						<button @click="previewTemplate = null"
							class="absolute -top-3 -right-3 w-8 h-8 bg-slate-800 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-slate-700 transition-all shadow-lg">
							<Icon name="ph:x-bold" size="14" />
						</button>
					</div>
				</div>
			</Teleport>

			<!-- Delete Confirmation Modal -->
			<ConfirmModal v-model="showDeleteModal" :title="$t('admin.templates.delete_modal_title')"
				:description="$t('admin.templates.delete_modal_description', { name: deletingTemplate?.name })"
				:confirm-text="$t('admin.templates.delete_modal_confirm')" type="danger" :loading="deleting" @confirm="deleteTemplate" />
		</div>
	</div>
</template>
