<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const router = useRouter()
const { show: showToast } = useToast()
import RichTextEditor from '~/components/RichTextEditor.vue'

const loading = ref(false)
const previewMode = ref(false)

const form = ref({
	name: '',
	subject: '',
	htmlContent: '',
})

const defaultTemplates = computed(() => [
	{
		name: t('marketing.new_campaign.template_simple'),
		icon: 'ph:newspaper-bold',
		subject: 'Les dernières nouvelles de {{commerce}}',
		content: `<h2 style="color: #1e293b; margin-bottom: 16px;">Bonjour {{prenom}} !</h2>
<p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
Nous avons de bonnes nouvelles à partager avec vous.
</p>
<p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
Écrivez votre contenu ici...
</p>
<p style="color: #64748b; line-height: 1.6;">
À bientôt !
</p>`
	},
	{
		name: t('marketing.new_campaign.template_promo'),
		icon: 'ph:tag-bold',
		subject: '{{prenom}}, une offre exclusive vous attend !',
		content: `<div style="text-align: center; margin-bottom: 24px;">
<h2 style="color: #1e293b; margin-bottom: 8px;">Offre Spéciale</h2>
<p style="color: #64748b; font-size: 18px;">Uniquement pour vous, {{prenom}}</p>
</div>
<div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
<p style="font-size: 32px; font-weight: bold; margin-bottom: 8px;">-20%</p>
<p style="opacity: 0.9;">Sur votre prochaine visite</p>
</div>
<p style="color: #64748b; line-height: 1.6; text-align: center;">
Présentez cet email en caisse pour bénéficier de votre réduction.
</p>`
	},
	{
		name: t('marketing.new_campaign.template_thanks'),
		icon: 'ph:heart-bold',
		subject: 'Merci {{prenom}} pour votre visite !',
		content: `<h2 style="color: #1e293b; margin-bottom: 16px;">Merci {{prenom}} !</h2>
<p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
Nous tenions à vous remercier pour votre visite chez {{commerce}}. Votre fidélité nous fait chaud au coeur !
</p>
<p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
Nous espérons que vous avez passé un agréable moment et nous sommes impatients de vous revoir.
</p>
<p style="color: #64748b; line-height: 1.6;">
À très bientôt,<br>
L'équipe {{commerce}}
</p>`
	},
	{
		name: t('marketing.new_campaign.template_event'),
		icon: 'ph:calendar-star-bold',
		subject: '{{prenom}}, ne manquez pas notre événement !',
		content: `<div style="text-align: center; margin-bottom: 24px;">
<h2 style="color: #1e293b; margin-bottom: 8px;">Événement Spécial</h2>
<p style="color: #64748b; font-size: 16px;">Chez {{commerce}}</p>
</div>
<div style="background: #f8fafc; padding: 24px; border-radius: 12px; border: 2px dashed #cbd5e1; margin-bottom: 24px; text-align: center;">
<p style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">À venir</p>
<p style="font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 8px;">[Nom de l'événement]</p>
<p style="color: #64748b;">[Date et heure]</p>
</div>
<p style="color: #64748b; line-height: 1.6; text-align: center;">
{{prenom}}, nous serions ravis de vous y voir ! Réservez votre place dès maintenant.
</p>`
	},
	{
		name: t('marketing.new_campaign.template_loyalty'),
		icon: 'ph:star-bold',
		subject: '{{prenom}}, merci pour votre fidélité !',
		content: `<div style="text-align: center; margin-bottom: 24px;">
<h2 style="color: #1e293b; margin-bottom: 8px;">Vous êtes un client fidèle !</h2>
<p style="color: #64748b;">Et ça, ça se récompense {{prenom}}</p>
</div>
<div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
<p style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">Cadeau exclusif</p>
<p style="opacity: 0.9;">Présentez cet email lors de votre prochaine visite chez {{commerce}}</p>
</div>
<p style="color: #64748b; line-height: 1.6; text-align: center;">
Merci de faire partie de nos clients les plus fidèles !
</p>`
	},
	{
		name: t('marketing.new_campaign.template_reminder'),
		icon: 'ph:gift-bold',
		subject: '{{prenom}}, votre lot vous attend toujours !',
		content: `<h2 style="color: #1e293b; margin-bottom: 16px;">N'oubliez pas votre cadeau, {{prenom}} !</h2>
<p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
Vous avez gagné un lot chez {{commerce}} mais ne l'avez pas encore récupéré.
</p>
<div style="background: #fef3c7; padding: 20px; border-radius: 12px; border-left: 4px solid #f59e0b; margin-bottom: 24px;">
<p style="color: #92400e; font-weight: bold; margin-bottom: 4px;">Votre lot vous attend !</p>
<p style="color: #a16207; font-size: 14px;">Passez en magasin avec votre code de retrait pour récupérer votre cadeau.</p>
</div>
<p style="color: #64748b; line-height: 1.6;">
À très bientôt chez {{commerce}} !
</p>`
	},
])

const applyTemplate = (template: any) => {
	form.value.subject = template.subject
	form.value.htmlContent = template.content
}

const saveDraft = async () => {
	if (!form.value.name || !form.value.subject || !form.value.htmlContent) {
		showToast(t('common.error'), 'error')
		return
	}

	loading.value = true
	try {
		const campaign = await $api('/marketing/campaigns', {
			method: 'POST',
			body: form.value,
		})
		showToast(t('marketing.campaign_detail.saved'), 'success')
		router.push(`/dashboard/marketing/campaigns/${campaign.id}`)
	} catch (e: any) {
		showToast(e?.data?.message || t('common.error'), 'error')
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex items-center gap-3">
			<NuxtLink to="/dashboard/marketing/campaigns"
				class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
				<Icon name="ph:arrow-left-bold" size="20" class="rtl:rotate-180" />
			</NuxtLink>
			<div>
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
					{{ $t('marketing.new_campaign.title') }}
				</h1>
				<p class="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
					{{ $t('marketing.new_campaign.subtitle') }}
				</p>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Form -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Basic Info -->
				<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6">
					<h3 class="font-bold text-slate-900 dark:text-white mb-4">{{ $t('marketing.new_campaign.information') }}</h3>
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
								{{ $t('marketing.new_campaign.campaign_name') }}
							</label>
							<input v-model="form.name" type="text" :placeholder="$t('marketing.new_campaign.campaign_name_placeholder')"
								class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
						</div>
						<div>
							<label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
								{{ $t('marketing.new_campaign.email_subject') }}
							</label>
							<input v-model="form.subject" type="text"
								:placeholder="$t('marketing.new_campaign.email_subject_placeholder')"
								class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
							<p class="text-xs text-slate-400 mt-1">
								{{ $t('marketing.new_campaign.personalize') }}
							</p>
						</div>
					</div>
				</div>

				<!-- Content -->
				<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="font-bold text-slate-900 dark:text-white">{{ $t('marketing.new_campaign.content') }}</h3>
						<button @click="previewMode = !previewMode"
							class="flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-lg transition-colors"
							:class="previewMode ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
							<Icon :name="previewMode ? 'ph:code-bold' : 'ph:eye-bold'" size="16" />
							{{ previewMode ? $t('marketing.new_campaign.edit') : $t('marketing.new_campaign.preview') }}
						</button>
					</div>

					<!-- Editor -->
					<div v-if="!previewMode">
						<RichTextEditor v-model="form.htmlContent" placeholder="Écrivez votre contenu ici..." />
					</div>

					<!-- Preview -->
					<div v-else class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6 min-h-[300px]">
						<div
							v-html="form.htmlContent.replace(/\{\{prenom\}\}/g, 'Jean').replace(/\{\{firstName\}\}/g, 'Jean').replace(/\{\{nom\}\}/g, 'Dupont').replace(/\{\{lastName\}\}/g, 'Dupont').replace(/\{\{email\}\}/g, 'jean@exemple.fr').replace(/\{\{commerce\}\}/g, 'Mon Commerce').replace(/\{\{businessName\}\}/g, 'Mon Commerce')">
						</div>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3">
					<NuxtLink to="/dashboard/marketing/campaigns"
						class="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
						{{ $t('marketing.new_campaign.cancel') }}
					</NuxtLink>
					<button @click="saveDraft" :disabled="loading"
						class="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-2">
						<Icon v-if="loading" name="ph:spinner-gap-bold" size="18" class="animate-spin" />
						<Icon v-else name="ph:floppy-disk-bold" size="18" />
						{{ $t('marketing.new_campaign.save') }}
					</button>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Templates -->
				<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6">
					<h3 class="font-bold text-slate-900 dark:text-white mb-4">{{ $t('marketing.new_campaign.templates') }}</h3>
					<div class="space-y-3">
						<button v-for="template in defaultTemplates" :key="template.name"
							@click="applyTemplate(template)"
							class="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left">
							<div
								class="w-8 h-8 rounded-md bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 flex-shrink-0">
								<Icon :name="template.icon" size="16" />
							</div>
							<span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ template.name
							}}</span>
						</button>
					</div>
				</div>

				<!-- Help -->
				<div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
					<h4 class="font-bold text-slate-900 dark:text-white mb-3">{{ $t('marketing.new_campaign.available_variables') }}</h4>
					<div class="space-y-2 text-sm">
						<div class="flex items-center justify-between">
							<code
								class="bg-white dark:bg-slate-800 px-2 py-1 rounded text-brand-600 text-xs">&#123;&#123;prenom&#125;&#125;</code>
							<span class="text-slate-500">{{ $t('marketing.new_campaign.firstname') }}</span>
						</div>
						<div class="flex items-center justify-between">
							<code
								class="bg-white dark:bg-slate-800 px-2 py-1 rounded text-brand-600 text-xs">&#123;&#123;nom&#125;&#125;</code>
							<span class="text-slate-500">{{ $t('marketing.new_campaign.lastname') }}</span>
						</div>
						<div class="flex items-center justify-between">
							<code
								class="bg-white dark:bg-slate-800 px-2 py-1 rounded text-brand-600 text-xs">&#123;&#123;email&#125;&#125;</code>
							<span class="text-slate-500">{{ $t('marketing.new_campaign.email') }}</span>
						</div>
						<div class="flex items-center justify-between">
							<code
								class="bg-white dark:bg-slate-800 px-2 py-1 rounded text-brand-600 text-xs">&#123;&#123;commerce&#125;&#125;</code>
							<span class="text-slate-500">{{ $t('marketing.new_campaign.business_name') }}</span>
						</div>
					</div>
				</div>

				<!-- Tips -->
				<div
					class="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
					<div class="flex gap-3">
						<Icon name="ph:lightbulb-fill" size="20" class="text-amber-600 flex-shrink-0 mt-0.5" />
						<div>
							<p class="text-sm font-bold text-amber-800 dark:text-amber-400 mb-1">{{ $t('marketing.new_campaign.tip') }}</p>
							<p class="text-sm text-amber-700 dark:text-amber-400/80">
								{{ $t('marketing.new_campaign.tip_message') }}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
