/**
 * Impersonation ("infiltration") state for the CURRENT tab.
 *
 * Only an isolated impersonation tab (marked via sessionStorage) has an
 * impersonation session. The admin tab and normal merchant tabs never do, so
 * the banner never shows there.
 */
export interface ImpersonationInfo {
	active: boolean
	targetEmail: string
	realAdminEmail: string
	startedAt: string
}

export function useImpersonation() {
	const { $api } = useNuxtApp()
	const info = useState<ImpersonationInfo | null>('impersonation', () => null)
	const loading = useState<boolean>('impersonation-loading', () => false)

	async function refresh() {
		// Only impersonation tabs can be in an impersonation session.
		if (import.meta.client && sessionStorage.getItem('impersonation_tab') !== '1') {
			info.value = null
			return
		}
		loading.value = true
		try {
			const res = await $api<{ impersonation: ImpersonationInfo | null }>('/auth/status')
			info.value = res.impersonation ?? null
		} catch {
			info.value = null
		} finally {
			loading.value = false
		}
	}

	/** End impersonation, destroy the isolated session, close/leave this tab. */
	async function stop() {
		try {
			await $api('/admin/impersonation/stop', { method: 'POST' })
		} catch {
			/* clear locally regardless */
		}
		info.value = null
		if (import.meta.client) {
			sessionStorage.removeItem('impersonation_tab')
			// This tab was opened by the admin tab: closing returns focus there.
			// If close is blocked (tab opened directly), fall back to the login.
			window.close()
			window.location.href = '/login'
		}
	}

	return { info, loading, refresh, stop }
}
