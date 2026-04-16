/**
 * Centralized Vue Query key factory.
 * All query keys live here so invalidation is consistent across the app.
 */
export const queryKeys = {
	games: {
		all: ['games'] as const,
		detail: (id: string) => ['games', id] as const,
	},
	players: {
		all: ['players'] as const,
	},
	orders: {
		all: ['orders'] as const,
		stats: ['orders', 'stats'] as const,
	},
	marketing: {
		stats: ['marketing', 'stats'] as const,
		campaigns: {
			all: ['marketing', 'campaigns'] as const,
			detail: (id: string) => ['marketing', 'campaigns', id] as const,
		},
		automations: ['marketing', 'automations'] as const,
		emailUsage: ['marketing', 'email-usage'] as const,
	},
	business: {
		me: ['business', 'me'] as const,
	},
	notifications: {
		list: ['notifications'] as const,
		count: ['notifications', 'count'] as const,
	},
	sessions: {
		all: ['sessions'] as const,
	},
	subscription: {
		plans: ['subscription', 'plans'] as const,
		invoices: ['subscription', 'invoices'] as const,
		trialInfo: ['subscription', 'trial-info'] as const,
	},
}
