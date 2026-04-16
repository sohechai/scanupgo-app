import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { queryKeys } from '~/composables/queryKeys'

export const useBusinessQuery = () => {
	const { $api } = useNuxtApp()

	return useQuery({
		queryKey: queryKeys.business.me,
		queryFn: () => $api<any>('/businesses/me'),
	})
}

export const useSaveBusinessMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, ...body }: { id: string } & Record<string, any>) =>
			$api<any>(`/businesses/${id}`, { method: 'PATCH', body }),
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.business.me, data)
		},
	})
}
