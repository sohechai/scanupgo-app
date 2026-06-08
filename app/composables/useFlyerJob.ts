export async function submitFlyerJob(
  $api: any,
  endpoint: '/flyer-generator/generate' | '/flyer-generator/generate-pdf',
  body: Record<string, any>,
  { pollInterval = 2000, timeout = 120000 } = {},
): Promise<string> {
  const { jobId } = await $api<{ jobId: string }>(endpoint, { method: 'POST', body })

  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollInterval))

    const status = await $api<{
      status: string
      url: string | null
      failedReason: string | null
    }>(`/flyer-generator/status/${jobId}`)

    if (status.status === 'completed' && status.url) return status.url
    if (status.status === 'failed') throw new Error(status.failedReason ?? 'Flyer generation failed')
  }

  throw new Error('Flyer generation timed out')
}
