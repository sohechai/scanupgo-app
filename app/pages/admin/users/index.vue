<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

const { t } = useI18n()
const { formatDate } = useLocaleDate()
const { $api } = useNuxtApp()

const loading = ref(true)
const searchQuery = ref('')
const roleFilter = ref('all') // 'all', 'SUPER_ADMIN', 'ADMINISTRATOR', 'COMMERCANT', 'PUBLIC'

// Users data
const users = ref<any[]>([])

// Fetch users from API
onMounted(async () => {
	try {
		const data = await $api<any[]>('/admin/users')
		users.value = data
	} catch (error) {
		console.error('Failed to fetch users:', error)
	} finally {
		loading.value = false
	}
})

const filteredUsers = computed(() => {
	return users.value.filter(u => {
		const matchesSearch =
			(u.firstName && u.firstName.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
			(u.lastName && u.lastName.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
			u.email.toLowerCase().includes(searchQuery.value.toLowerCase())

		const matchesRole = roleFilter.value === 'all' || u.role === roleFilter.value
		return matchesSearch && matchesRole
	})
})

const getRoleLabel = (role: string) => {
	switch (role) {
		case 'SUPER_ADMIN':
			return t('admin.users.role_super_admin')
		case 'ADMINISTRATOR':
			return t('admin.users.role_administrator')
		case 'COMMERCANT':
			return t('admin.users.role_commercant')
		case 'PUBLIC':
			return t('admin.users.role_public')
		default:
			return role
	}
}

const getRoleClass = (role: string) => {
	switch (role) {
		case 'SUPER_ADMIN':
			return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
		case 'ADMINISTRATOR':
			return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
		case 'COMMERCANT':
			return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
		case 'PUBLIC':
			return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
		default:
			return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
	}
}

const getUserInitials = (user: any) => {
	if (user.firstName && user.lastName) {
		return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
	}
	return user.email.charAt(0).toUpperCase()
}

const getUserName = (user: any) => {
	if (user.firstName && user.lastName) {
		return `${user.firstName} ${user.lastName}`
	}
	return user.email
}
</script>

<template>
	<div class="relative min-h-screen">
		<!-- Background Elements -->
		<div class="fixed inset-0 pointer-events-none z-0">
			<div
				class="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-500/20 rounded-full blur-[120px] opacity-30 mix-blend-screen">
			</div>
			<div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] opacity-30 mix-blend-screen"
				style="animation-delay: 2s;"></div>
		</div>

		<div class="relative z-10 space-y-8 pb-10">
			<!-- Header -->
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1
						class="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
						{{ $t('admin.users.title') }}</h1>
					<p class="text-slate-400 text-lg">{{ $t('admin.users.description') }}</p>
				</div>
				<button
					class="px-4 py-2 bg-white hover:bg-slate-100 text-black rounded-xl font-bold transition-all shadow-lg shadow-white/5 flex items-center gap-2 text-sm">
					<Icon name="ph:user-plus-bold" />
					{{ $t('admin.users.add_button') }}
				</button>
			</div>

			<!-- Filters & Actions -->
			<div class="flex flex-col md:flex-row gap-4">
				<div class="relative flex-1">
					<Icon name="ph:magnifying-glass" class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500"
						size="20" />
					<input v-model="searchQuery" type="text" :placeholder="$t('admin.users.search_placeholder')"
						class="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl pl-10 rtl:pl-4 pr-4 rtl:pr-10 py-3 text-white placeholder-slate-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 outline-none transition-all" />
				</div>
				<div class="flex gap-2">
					<select v-model="roleFilter"
						class="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-slate-300 focus:border-white/20 outline-none cursor-pointer">
						<option value="all" class="bg-slate-900">{{ $t('admin.users.role_filter_all') }}</option>
						<option value="SUPER_ADMIN" class="bg-slate-900">{{ $t('admin.users.role_filter_super_admin') }}</option>
						<option value="ADMINISTRATOR" class="bg-slate-900">{{ $t('admin.users.role_filter_administrator') }}</option>
						<option value="COMMERCANT" class="bg-slate-900">{{ $t('admin.users.role_filter_commercant') }}</option>
						<option value="PUBLIC" class="bg-slate-900">{{ $t('admin.users.role_filter_public') }}</option>
					</select>
				</div>
			</div>

			<!-- Users Table -->
			<div
				class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-white/5 border-b border-white/10">
							<tr>
								<th
									class="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.users.table_header_user') }}</th>
								<th
									class="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.users.table_header_role') }}</th>
								<th
									class="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.users.table_header_business') }}</th>
								<th
									class="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.users.table_header_created') }}</th>
								<th
									class="px-6 py-4 text-right rtl:text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.users.table_header_actions') }}</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/5">
							<tr v-if="loading" v-for="i in 5" :key="i" class="animate-pulse">
								<td class="px-6 py-4">
									<div class="h-4 bg-white/10 rounded w-32"></div>
								</td>
								<td class="px-6 py-4">
									<div class="h-4 bg-white/10 rounded w-24"></div>
								</td>
								<td class="px-6 py-4">
									<div class="h-4 bg-white/10 rounded w-24"></div>
								</td>
								<td class="px-6 py-4">
									<div class="h-4 bg-white/10 rounded w-32"></div>
								</td>
								<td class="px-6 py-4 text-right rtl:text-left">
									<div class="h-8 w-8 bg-white/10 rounded ml-auto rtl:ml-0 rtl:mr-auto"></div>
								</td>
							</tr>
							<tr v-else v-for="user in filteredUsers" :key="user.id"
								class="hover:bg-white/5 transition-colors group">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center gap-3">
										<div
											class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-sm text-slate-300">
											{{ getUserInitials(user) }}
										</div>
										<div>
											<div class="font-bold text-white">{{ getUserName(user) }}</div>
											<div class="text-xs text-slate-500">{{ user.email }}</div>
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										:class="['px-2.5 py-1 rounded-lg text-xs font-bold border', getRoleClass(user.role)]">
										{{ getRoleLabel(user.role) }}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-slate-300">
									{{ user.businessName || '-' }}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
									{{ formatDate(user.createdAt) }}
								</td>
								<td class="px-6 py-4 text-right rtl:text-left">
									<button
										class="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
										<Icon name="ph:pencil-simple-bold" size="20" />
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Empty State -->
				<div v-if="!loading && filteredUsers.length === 0" class="p-12 text-center text-slate-500">
					<Icon name="ph:users-three-duotone" size="48" class="mx-auto mb-4 opacity-50" />
					<p v-if="users.length === 0">{{ $t('admin.users.no_users') }}</p>
					<p v-else>{{ $t('admin.users.no_results') }}</p>
				</div>
			</div>

			<!-- Stats Summary -->
			<div v-if="!loading && users.length > 0" class="grid grid-cols-1 md:grid-cols-4 gap-6">
				<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
					<div class="text-xs text-slate-400 mb-1">{{ $t('admin.users.stats_total') }}</div>
					<div class="text-3xl font-bold text-white">{{ users.length }}</div>
				</div>
				<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
					<div class="text-xs text-slate-400 mb-1">{{ $t('admin.users.stats_commercants') }}</div>
					<div class="text-3xl font-bold text-blue-400">
						{{users.filter(u => u.role === 'COMMERCANT').length}}
					</div>
				</div>
				<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
					<div class="text-xs text-slate-400 mb-1">{{ $t('admin.users.stats_administrators') }}</div>
					<div class="text-3xl font-bold text-orange-400">
						{{users.filter(u => u.role === 'ADMINISTRATOR').length}}
					</div>
				</div>
				<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
					<div class="text-xs text-slate-400 mb-1">{{ $t('admin.users.stats_super_admins') }}</div>
					<div class="text-3xl font-bold text-purple-400">
						{{users.filter(u => u.role === 'SUPER_ADMIN').length}}
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
