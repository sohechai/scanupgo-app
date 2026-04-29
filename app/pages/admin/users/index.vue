<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

useHead({ title: 'Utilisateurs' })

const { formatDate } = useLocaleDate()
const { $api } = useNuxtApp()
const toast = useToast()

const loading = ref(true)
const searchQuery = ref('')
const roleFilter = ref('all')

const users = ref<any[]>([])

// Action state
const confirmModal = ref<{ type: 'delete'; user: any } | null>(null)
const actionLoading = ref(false)

const closeMenu = () => { menuState.value = null; menuUser.value = null }

onMounted(async () => {
	try {
		const data = await $api<any[]>('/admin/users')
		users.value = data
	} catch (error) {
		console.error('Failed to fetch users:', error)
	} finally {
		loading.value = false
	}

	document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
	document.removeEventListener('click', closeMenu)
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

const roleLabels: Record<string, string> = {
	SUPER_ADMIN: 'Super Admin',
	ADMINISTRATOR: 'Administrateur',
	COMMERCANT: 'Commerçant',
	PUBLIC: 'Public',
}

const getRoleLabel = (role: string) => roleLabels[role] ?? role

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

const superAdminUsers = computed(() =>
	filteredUsers.value.filter(u => u.role === 'SUPER_ADMIN')
)

const regularUsers = computed(() =>
	filteredUsers.value.filter(u => u.role !== 'SUPER_ADMIN')
)

// Actions
// menuState per user: null | 'main' | 'roles'
const menuState = ref<{ userId: string; view: 'main' | 'roles' } | null>(null)
const menuUser = ref<any>(null)
const dropdownPos = ref({ top: 0, right: 0 })

function toggleMenu(e: Event, user: any) {
	e.stopPropagation()
	if (menuState.value?.userId === user.id) {
		menuState.value = null
		menuUser.value = null
		return
	}
	const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
	dropdownPos.value = {
		top: rect.bottom + 4,
		right: window.innerWidth - rect.right,
	}
	menuUser.value = user
	menuState.value = { userId: user.id, view: 'main' }
}

function showRoles(e: Event) {
	e.stopPropagation()
	if (menuState.value) menuState.value = { ...menuState.value, view: 'roles' }
}

function backToMain(e: Event) {
	e.stopPropagation()
	if (menuState.value) menuState.value = { ...menuState.value, view: 'main' }
}

function openConfirm(type: 'delete', user: any) {
	menuState.value = null
	menuUser.value = null
	confirmModal.value = { type, user }
}

async function confirmAction() {
	if (!confirmModal.value) return
	actionLoading.value = true
	try {
		await $api(`/admin/users/${confirmModal.value.user.id}`, { method: 'DELETE' })
		users.value = users.value.filter(u => u.id !== confirmModal.value!.user.id)
		toast.show('Utilisateur supprimé', 'success')
		confirmModal.value = null
	} catch (err: any) {
		toast.show(err?.data?.message || 'Erreur', 'error')
	} finally {
		actionLoading.value = false
	}
}

async function changeRole(e: Event, user: any, newRole: string) {
	e.stopPropagation()
	if (user.role === newRole) return
	menuState.value = null
	menuUser.value = null
	try {
		await $api(`/admin/users/${user.id}/role`, { method: 'PUT', body: { role: newRole } })
		const u = users.value.find(u => u.id === user.id)
		if (u) u.role = newRole
		toast.show('Rôle mis à jour', 'success')
	} catch (err: any) {
		toast.show(err?.data?.message || 'Erreur', 'error')
	}
}
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
						<!-- SUPER_ADMIN rows -->
						<tr v-for="user in superAdminUsers" :key="user.id" class="bg-purple-500/[0.06] hover:bg-purple-500/[0.1] transition-colors group">
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-md bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-semibold text-purple-300 shrink-0">
										{{ getUserInitials(user) }}
									</div>
									<div>
										<p class="text-sm font-medium text-white">{{ getUserName(user) }}</p>
										<p class="text-xs text-slate-500">{{ user.email }}</p>
									</div>
								</div>
							</td>
							<td class="px-4 py-3">
								<span class="inline-flex items-center gap-1.5 text-xs font-medium text-purple-400">
									<span class="w-1.5 h-1.5 rounded-full shrink-0 bg-purple-400"></span>
									{{ getRoleLabel(user.role) }}
								</span>
							</td>
							<td class="px-4 py-3"><span class="text-sm text-slate-300">{{ user.businessName || '—' }}</span></td>
							<td class="px-4 py-3"><span class="text-sm text-slate-400">{{ formatDate(user.createdAt) }}</span></td>
							<td class="px-4 py-3 text-right rtl:text-left">
								<button
									@click="(e) => toggleMenu(e, user)"
									class="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] rounded-md transition-colors opacity-0 group-hover:opacity-100"
								>
									<Icon name="ph:dots-three-vertical-bold" size="14" />
								</button>
							</td>
						</tr>
						<!-- Separator if both sections have items -->
						<tr v-if="superAdminUsers.length > 0 && regularUsers.length > 0">
							<td colspan="5" class="px-4 py-1.5 bg-white/[0.02]">
								<span class="text-xs text-slate-600">{{ $t('admin.users.role_filter_commercant') }}</span>
							</td>
						</tr>
						<!-- Regular users -->
						<tr v-for="user in regularUsers" :key="user.id" class="hover:bg-white/[0.02] transition-colors group">
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
							<td class="px-4 py-3"><span class="text-sm text-slate-300">{{ user.businessName || '—' }}</span></td>
							<td class="px-4 py-3"><span class="text-sm text-slate-400">{{ formatDate(user.createdAt) }}</span></td>
							<td class="px-4 py-3 text-right rtl:text-left">
								<!-- Action menu trigger only -->
								<button
									@click="(e) => toggleMenu(e, user)"
									class="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] rounded-md transition-colors opacity-0 group-hover:opacity-100"
								>
									<Icon name="ph:dots-three-vertical-bold" size="14" />
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

		<!-- Action dropdown (teleported to avoid overflow-hidden clipping) -->
		<Teleport to="body">
			<div
				v-if="menuState && menuUser"
				class="fixed z-[200] w-44 bg-[#1e2330] border border-white/[0.1] rounded-lg shadow-2xl py-1"
				:style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }"
				@click.stop
			>
				<template v-if="menuState.view === 'main'">
					<!-- SUPER_ADMIN : rétrograder uniquement -->
					<template v-if="menuUser.role === 'SUPER_ADMIN'">
						<button
							@click="(e) => changeRole(e, menuUser, 'COMMERCANT')"
							class="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/[0.08] transition-colors"
						>
							<Icon name="ph:arrow-circle-down-bold" size="13" />
							Rétrograder en commerçant
						</button>
					</template>
					<!-- Autres rôles -->
					<template v-else>
						<button
							@click="showRoles"
							class="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors"
						>
							<span class="flex items-center gap-2">
								<Icon name="ph:shield-bold" size="13" class="text-slate-500" />
								Changer le rôle
							</span>
							<Icon name="ph:caret-right-bold" size="11" class="text-slate-600" />
						</button>
						<div class="my-1 border-t border-white/[0.06]"></div>
						<button
							@click="openConfirm('delete', menuUser)"
							class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/[0.08] transition-colors"
						>
							<Icon name="ph:trash-bold" size="13" />
							Supprimer
						</button>
					</template>
				</template>

				<template v-else>
					<button
						@click="backToMain"
						class="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
					>
						<Icon name="ph:caret-left-bold" size="11" />
						Retour
					</button>
					<div class="my-1 border-t border-white/[0.06]"></div>
					<button
						v-for="r in ['COMMERCANT', 'SUPER_ADMIN']"
						:key="r"
						@click="(e) => changeRole(e, menuUser, r)"
						class="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
						:class="menuUser.role === r ? 'text-white bg-white/[0.06] cursor-default' : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'"
					>
						<span class="w-1.5 h-1.5 rounded-full shrink-0" :class="getRoleDot(r)"></span>
						{{ getRoleLabel(r) }}
						<Icon v-if="menuUser.role === r" name="ph:check-bold" size="11" class="ml-auto text-brand-400" />
					</button>
				</template>
			</div>
		</Teleport>

		<!-- Confirm delete modal -->
		<Teleport to="body">
			<div v-if="confirmModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="confirmModal = null">
				<div class="bg-[#0f172a] border border-white/[0.1] rounded-xl p-6 w-full max-w-sm shadow-2xl">
					<div class="flex items-start gap-3 mb-4">
						<div class="p-2 rounded-lg bg-red-500/10 shrink-0">
							<Icon name="ph:trash-bold" size="18" class="text-red-400" />
						</div>
						<div>
							<p class="text-sm font-semibold text-white">Supprimer ce compte ?</p>
							<p class="text-xs text-slate-500 mt-0.5">{{ getUserName(confirmModal.user) }} · {{ confirmModal.user.email }}</p>
						</div>
					</div>

					<p class="text-xs text-slate-400 mb-5">
						Cette action est irréversible. Toutes les données liées à ce compte seront supprimées.
					</p>

					<div class="flex gap-2">
						<button
							@click="confirmModal = null"
							class="flex-1 px-3 py-2 text-sm text-slate-400 bg-white/[0.04] hover:bg-white/[0.07] rounded-lg transition-colors"
						>
							Annuler
						</button>
						<button
							@click="confirmAction"
							:disabled="actionLoading"
							class="flex-1 px-3 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
						>
							{{ actionLoading ? '...' : 'Supprimer' }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>

	</div>
</template>
