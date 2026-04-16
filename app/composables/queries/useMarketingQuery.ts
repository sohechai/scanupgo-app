import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { queryKeys } from '~/composables/queryKeys'

// ─── Stats ──────────────────────────────────────────────────────────────────

export const useMarketingStatsQuery = () => {
	const { $api } = useNuxtApp()
	const { hasActiveSubscription } = useSubscription()

	return useQuery({
		queryKey: queryKeys.marketing.stats,
		queryFn: () => $api<any>('/marketing/stats'),
		enabled: computed(() => hasActiveSubscription.value),
	})
}

// ─── Campaigns ──────────────────────────────────────────────────────────────

export const useCampaignsQuery = () => {
	const { $api } = useNuxtApp()
	const { hasActiveSubscription } = useSubscription()

	return useQuery({
		queryKey: queryKeys.marketing.campaigns.all,
		queryFn: () => $api<any[]>('/marketing/campaigns').then(d => d ?? []),
		enabled: computed(() => hasActiveSubscription.value),
	})
}

export const useCampaignDetailQuery = (id: ComputedRef<string> | Ref<string>) => {
	const { $api } = useNuxtApp()

	return useQuery({
		queryKey: computed(() => queryKeys.marketing.campaigns.detail(unref(id))),
		queryFn: () => $api<any>(`/marketing/campaigns/${unref(id)}`),
		enabled: computed(() => !!unref(id)),
	})
}

export const useEmailUsageQuery = () => {
	const { $api } = useNuxtApp()

	return useQuery({
		queryKey: queryKeys.marketing.emailUsage,
		queryFn: () => $api<any>('/marketing/email-usage'),
	})
}

export const useCreateCampaignMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (body: any) => $api<any>('/marketing/campaigns', { method: 'POST', body }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.marketing.campaigns.all })
		},
	})
}

export const useSaveCampaignMutation = (id: ComputedRef<string> | Ref<string>) => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (body: any) => $api<any>(`/marketing/campaigns/${unref(id)}`, { method: 'PATCH', body }),
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.marketing.campaigns.detail(unref(id)), data)
			queryClient.invalidateQueries({ queryKey: queryKeys.marketing.campaigns.all })
		},
	})
}

export const useSendCampaignMutation = (id: ComputedRef<string> | Ref<string>) => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () => $api<any>(`/marketing/campaigns/${unref(id)}/send`, { method: 'POST' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.marketing.campaigns.detail(unref(id)) })
			queryClient.invalidateQueries({ queryKey: queryKeys.marketing.campaigns.all })
			queryClient.invalidateQueries({ queryKey: queryKeys.marketing.stats })
		},
	})
}

export const useDeleteCampaignMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()
	const { show: showToast } = useToast()
	const { t } = useI18n()

	return useMutation({
		mutationFn: (id: string) => $api(`/marketing/campaigns/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.marketing.campaigns.all })
			showToast(t('marketing.campaigns.delete'), 'success')
		},
		onError: () => {
			showToast(t('common.error'), 'error')
		},
	})
}

// ─── Automations ─────────────────────────────────────────────────────────────

export const useAutomationsQuery = () => {
	const { $api } = useNuxtApp()
	const { hasActiveSubscription } = useSubscription()

	return useQuery({
		queryKey: queryKeys.marketing.automations,
		queryFn: () => $api<any[]>('/marketing/automations').then(d => d ?? []),
		enabled: computed(() => hasActiveSubscription.value),
	})
}

export const useCreateAutomationMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (body: any) => $api<any>('/marketing/automations', { method: 'POST', body }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.marketing.automations })
		},
	})
}

export const useSaveAutomationMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, ...body }: { id: string } & Record<string, any>) =>
			$api<any>(`/marketing/automations/${id}`, { method: 'PATCH', body }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.marketing.automations })
		},
	})
}

export const useDeleteAutomationMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => $api(`/marketing/automations/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.marketing.automations })
		},
	})
}

export const useToggleAutomationMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, active }: { id: string; active: boolean }) =>
			$api<any>(`/marketing/automations/${id}`, { method: 'PATCH', body: { active } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.marketing.automations })
		},
	})
}
