<template>
	<div class="min-h-screen flex font-sans bg-white text-slate-900">
		<!-- Left Side: Brand Experience -->
		<div class="hidden lg:flex lg:w-1/2 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden">
			<!-- Background Pattern -->
			<div class="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-slate-900 pointer-events-none"></div>
			<!-- Optional subtle grid or noise -->
			<div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E')"></div>

			<!-- Brand Logo (Top) -->
			<div class="relative z-10">
				<div class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10">
					<span class="font-display font-bold text-white text-lg">B.</span>
				</div>
			</div>

			<!-- Hero Content (Middle/Bottom) -->
			<div class="relative z-10 max-w-lg">
				<h2 class="text-3xl font-display font-semibold text-white mb-6 tracking-tight">
					{{ $t('auth.hero_title_1') }} <br/>
					{{ $t('auth.hero_title_2') }} <span class="text-brand-400">{{ $t('auth.hero_title_highlight') }}</span>.
				</h2>
				<p class="text-slate-400 text-lg leading-relaxed mb-8">
					{{ $t('auth.hero_description') }}
				</p>

				<!-- Simple testimonial or trust badge -->
				<div class="flex items-center gap-4 pt-8 border-t border-white/10">
					<div class="flex -space-x-2 rtl:space-x-reverse">
						<div class="w-8 h-8 rounded-full bg-slate-700 border border-slate-900"></div>
						<div class="w-8 h-8 rounded-full bg-slate-600 border border-slate-900"></div>
						<div class="w-8 h-8 rounded-full bg-slate-500 border border-slate-900"></div>
					</div>
					<div class="text-sm text-slate-400">
						{{ $t('auth.trust_badge') }} <span class="text-white font-medium">{{ $t('auth.trust_count') }}</span>
					</div>
				</div>
			</div>

			<!-- Decorative Blur -->
			<div class="absolute bottom-0 right-0 rtl:right-auto rtl:left-0 w-96 h-96 bg-brand-600/20 rounded-full blur-[128px] pointer-events-none"></div>
		</div>

		<!-- Right Side: Form Container -->
		<div class="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-white relative">
			<!-- Language Selector in top-right corner -->
			<div class="absolute top-6 right-6 rtl:right-auto rtl:left-6">
				<LanguageSelector />
			</div>
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
// Simple layout for Auth pages, no Navbar/Footer
</script>
