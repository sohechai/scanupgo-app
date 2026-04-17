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
const roleFilter = ref('all')

const users = ref<any[]>([])

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
		case 'SUPER_ADMIN': return t('admin.users.role_super_admin')
		case 'ADMINISTRATOR': return t('admin.users.role_administrator')
		case 'COMMERCANT': return t('admin.users.role_commercant')
		case 'PUBLIC': return t('admin.users.role_public')
		default: return role
	}
}

const getRoleDot = (role: string) => {
	switch (role) {
		case 'SUPER_ADMIN': return 'bg-purple-400'
		case 'ADMINISTRATOR': return 'bg-orange-400'
		case 'COMMERCANT': return 'bg-brand-400'
		case 'PUBLIC': return 'bg-slate-500'
		default: return 'bg-slate-600'
	}
}

const getRoleColor = (role: string) => {
	switch (role) {
		case 'SUPER_ADMIN': return 'text-purple-400'
		case 'ADMINISTRATOR': return 'text-orange-400'
		case 'COMMERCANT': return 'text-brand-400'
		case 'PUBLIC': return 'text-slate-400'
		default: return 'text-slate-500'
	}
}

const getUserInitials = (user: any) => {
	if (user.firstName && user.lastName) return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
	return user.email.charAt(0).toUpperCase()
}

const getUserName = (user: any) => {
	if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
	return user.email
}

const stats = computed(() => ({
	total: users.value.length,
	commercants: users.value.filter(u => u.role === 'COMMERCANT').length,
	admins: users.value.filter(u => u.role === 'ADMINISTRATOR').length,
	superAdmins: users.value.filter(u => u.role === 'SUPER_ADMIN').length,
}))
</script>

<template>
	<div class="space-y-5 pb-8">

		<!-- Header -->
		<div class="flex items-start justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold text-white">{{ $t('admin.users.title') }}</h1>
				<p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.users.description') }}</p>
			</div>
			<button class="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-900 text-sm font-semibold rounded-md hover:bg-slate-100 transition-colors shrink-0">
				<Icon name="ph:user-plus-bold" size="15" />
				{{ $t('admin.users.add_button') }}
			</button>
		</div>

		<!-- Stats -->
		<div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<div v-for="i in 4" :key="i" class="h-20 bg-[#161920] border border-white/[0.07] rounded-lg animate-pulse"></div>
		</div>
		<div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<p class="text-xs text-slate-500 mb-1">{{ $t('admin.users.stats_total') }}</p>
				<p class="text-2xl font-semibold text-white tabular-nums">{{ stats.total }}</p>
			</div>
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<p class="text-xs text-slate-500 mb-1">{{ $t('admin.users.stats_commercants') }}</p>
				<p class="text-2xl font-semibold text-brand-400 tabular-nums">{{ stats.commercants }}</p>
			</div>
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<p class="text-xs text-slate-500 mb-1">{{ $t('admin.users.stats_administrators') }}</p>
				<p class="text-2xl font-semibold text-orange-400 tabular-nums">{{ stats.admins }}</p>
			</div>
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<p class="text-xs text-slate-500 mb-1">{{ $t('admin.users.stats_super_admins') }}</p>
				<p class="text-2xl font-semibold text-purple-400 tabular-nums">{{ stats.superAdmins }}</p>
			</div>
		</div>

		<!-- Filters -->
		<div class="flex flex-col sm:flex-row gap-3">
			<div class="relative flex-1">
				<Icon name="ph:magnifying-glass-bold" size="15" class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" />
				<input v-model="searchQuery" type="text" :placeholder="$t('admin.users.search_placeholder')"
					class="w-full pl-9 rtl:pl-3 pr-3 rtl:pr-9 py-2 bg-[#161920] border border-white/[0.07] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
			</div>
			<select v-model="roleFilter"
				class="px-3 py-2 bg-[#161920] border border-white/[0.07] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors appearance-none">
				<option value="all" class="bg-[#161920]">{{ $t('admin.users.role_filter_all') }}</option>
				<option value="SUPER_ADMIN" class="bg-[#161920]">{{ $t('admin.users.role_filter_super_admin') }}</option>
				<option value="ADMINISTRATOR" class="bg-[#161920]">{{ $t('admin.users.role_filter_administrator') }}</option>
				<option value="COMMERCANT" class="bg-[#161920]">{{ $t('admin.users.role_filter_commercant') }}</option>
				<option value="PUBLIC" class="bg-[#161920]">{{ $t('admin.users.role_filter_public') }}</option>
			</select>
		</div>

		<!-- Table -->
		<div class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
			<div v-if="loading" class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-white/[0.06]">
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.users.table_header_user') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.users.table_header_role') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.users.table_header_business') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.users.table_header_created') }}</th>
							<th class="px-4 py-3 text-right rtl:text-left text-xs font-medium text-slate-500">{{ $t('admin.users.table_header_actions') }}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-white/[0.04]">
						<tr v-for="i in 6" :key="i" class="animate-pulse">
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 bg-white/[0.06] rounded-md shrink-0"></div>
									<div class="space-y-1.5">
										<div class="h-3 bg-white/[0.06] rounded w-28"></div>
										<div class="h-2.5 bg-white/[0.04] rounded w-36"></div>
									</div>
								</div>
							</td>
							<td class="px-4 py-3"><div class="h-3 bg-white/[0.06] rounded w-20"></div></td>
							<td class="px-4 py-3"><div class="h-3 bg-white/[0.06] rounded w-24"></div></td>
							<td class="px-4 py-3"><div class="h-3 bg-white/[0.06] rounded w-24"></div></td>
							<td class="px-4 py-3 text-right rtl:text-left"><div class="h-6 w-6 bg-white/[0.06] rounded ml-auto rtl:ml-0 rtl:mr-auto"></div></td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-else-if="filteredUsers.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-600">
				<Icon name="ph:users-three-duotone" size="28" class="mb-2" />
				<p class="text-sm">{{ users.length === 0 ? $t('admin.users.no_users') : $t('admin.users.no_results') }}</p>
			</div>

			<div v-else class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-white/[0.06]">
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.users.table_header_user') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.users.table_header_role') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.users.table_header_business') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.users.table_header_created') }}</th>
							<th class="px-4 py-3 text-right rtl:text-left text-xs font-medium text-slate-500">{{ $t('admin.users.table_header_actions') }}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-white/[0.04]">
						<tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-white/[0.02] transition-colors group">
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
							<td class="px-4 py-3">
								<span class="inline-flex items-center gap-1.5 text-xs font-medium" :class="getRoleColor(user.role)">
									<span class="w-1.5 h-1.5 rounded-full shrink-0" :class="getRoleDot(user.role)"></span>
									{{ getRoleLabel(user.role) }}
								</span>
							</td>
							<td class="px-4 py-3">
								<span class="text-sm text-slate-300">{{ user.businessName || '—' }}</span>
							</td>
							<td class="px-4 py-3">
								<span class="text-sm text-slate-400">{{ formatDate(user.createdAt) }}</span>
							</td>
							<td class="px-4 py-3 text-right rtl:text-left">
								<button class="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] rounded-md transition-colors opacity-0 group-hover:opacity-100">
									<Icon name="ph:pencil-simple-bold" size="14" />
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-if="!loading && filteredUsers.length > 0" class="px-4 py-2.5 border-t border-white/[0.04]">
				<p class="text-xs text-slate-600">{{ filteredUsers.length }} {{ $t('admin.users.stats_total').toLowerCase() }}</p>
			</div>
		</div>

	</div>
</template>
