<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

const { t } = useI18n()
const { formatDate } = useLocaleDate()
const { $api } = useNuxtApp()
const config = useRuntimeConfig()

useHead({ title: 'Infiltration' })

const loading = ref(true)
const searchQuery = ref('')
const users = ref<any[]>([])
const startingId = ref<string | null>(null)
const errorMsg = ref('')

onMounted(async () => {
	try {
		const data = await $api<any[]>('/admin/users')
		// Only merchants can be infiltrated.
		users.value = data.filter((u) => u.role === 'COMMERCANT')
	} catch (error) {
		console.error('Failed to fetch users:', error)
	} finally {
		loading.value = false
	}
})

const filteredUsers = computed(() =>
	users.value.filter((u) => {
		const q = searchQuery.value.toLowerCase()
		return (
			(u.firstName && u.firstName.toLowerCase().includes(q)) ||
			(u.lastName && u.lastName.toLowerCase().includes(q)) ||
			u.email.toLowerCase().includes(q) ||
			(u.businessName && u.businessName.toLowerCase().includes(q))
		)
	})
)

const getUserInitials = (user: any) => {
	if (user.firstName && user.lastName) return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
	return user.email.charAt(0).toUpperCase()
}

const getUserName = (user: any) => {
	if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
	return user.email
}

const infiltrate = async (user: any) => {
	errorMsg.value = ''
	startingId.value = user.id
	try {
		// START only mints a token — it does NOT touch this admin session.
		const res = await $api<{ token: string }>(`/admin/impersonation/start/${user.id}`, { method: 'POST' })
		// Open the transition page in a NEW tab; it redeems the token into an
		// isolated merchant session. This admin tab stays fully intact.
		if (import.meta.client) {
			window.open(`/enter-impersonation?token=${encodeURIComponent(res.token)}`, '_blank')
		}
	} catch (e: any) {
		errorMsg.value = e?.data?.message || t('impersonation.start_error')
	} finally {
		startingId.value = null
	}
}
</script>

<template>
	<div class="space-y-5 pb-8">

		<!-- Header -->
		<div>
			<h1 class="text-xl font-semibold text-white">{{ t('impersonation.title') }}</h1>
			<p class="text-sm text-slate-500 mt-0.5">{{ t('impersonation.description') }}</p>
		</div>

		<!-- Warning banner -->
		<div class="flex items-start gap-3 px-4 py-3 bg-red-500/[0.08] border border-red-500/20 rounded-lg">
			<Icon name="ph:warning-duotone" size="20" class="text-red-400 shrink-0 mt-0.5" />
			<div class="text-sm text-red-300/90">
				<p class="font-semibold text-red-300">{{ t('impersonation.warning_title') }}</p>
				<p class="mt-0.5 text-red-300/70">{{ t('impersonation.warning_body') }}</p>
			</div>
		</div>

		<!-- Error -->
		<div v-if="errorMsg" class="px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-400">
			{{ errorMsg }}
		</div>

		<!-- Search -->
		<div class="relative">
			<Icon name="ph:magnifying-glass-bold" size="15" class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" />
			<input v-model="searchQuery" type="text" :placeholder="t('impersonation.search_placeholder')"
				class="w-full pl-9 rtl:pl-3 pr-3 rtl:pr-9 py-2 bg-[#161920] border border-white/[0.07] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
		</div>

		<!-- Table -->
		<div class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
			<div v-if="loading" class="p-10 flex justify-center">
				<Icon name="ph:spinner-gap-bold" size="24" class="text-brand-500 animate-spin" />
			</div>

			<div v-else-if="filteredUsers.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-600">
				<Icon name="ph:users-three-duotone" size="28" class="mb-2" />
				<p class="text-sm">{{ users.length === 0 ? t('impersonation.no_merchants') : t('impersonation.no_results') }}</p>
			</div>

			<div v-else class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-white/[0.06]">
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ t('impersonation.table_merchant') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ t('impersonation.table_business') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ t('impersonation.table_created') }}</th>
							<th class="px-4 py-3 text-right rtl:text-left text-xs font-medium text-slate-500">{{ t('impersonation.table_action') }}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-white/[0.04]">
						<tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-white/[0.02] transition-colors">
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-md bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0">
										{{ getUserInitials(user) }}
									</div>
									<div>
										<p class="text-sm font-medium text-white">{{ getUserName(user) }}</p>
										<p class="text-xs text-slate-500">{{ user.email }}</p>
									</div>
								</div>
							</td>
							<td class="px-4 py-3"><span class="text-sm text-slate-300">{{ user.businessName || '—' }}</span></td>
							<td class="px-4 py-3"><span class="text-sm text-slate-400">{{ formatDate(user.createdAt) }}</span></td>
							<td class="px-4 py-3 text-right rtl:text-left">
								<button
									:disabled="startingId === user.id"
									@click="infiltrate(user)"
									class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold rounded-md hover:bg-red-500/20 transition-colors disabled:opacity-50">
									<Icon :name="startingId === user.id ? 'ph:spinner-gap-bold' : 'ph:eye-duotone'" size="14" :class="startingId === user.id ? 'animate-spin' : ''" />
									{{ t('impersonation.infiltrate_button') }}
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

	</div>
</template>
