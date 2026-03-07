/**
 * @deprecated Use useAuthStore() instead
 * This composable is kept for backward compatibility
 */
export const useAuth = () => {
	const authStore = useAuthStore()

	return {
		user: computed(() => authStore.user),
		signIn: (email: string, password: string, rememberMe?: boolean) => authStore.signIn(email, password, rememberMe),
		signUp: (email: string, password: string, firstName?: string, lastName?: string, cgvAccepted?: boolean) => authStore.signUp(email, password, firstName, lastName, cgvAccepted),
		signOut: () => authStore.signOut(),
		fetchUser: () => authStore.fetchUser()
	}
}

