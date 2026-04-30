<script setup lang="ts">
defineProps<{
  show: boolean
  game: any
  business: any
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-[200] flex items-end justify-center" @click.self="emit('close')">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')"></div>
        <div class="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <h2 class="text-base font-black text-slate-900 uppercase tracking-wide">Règlement du jeu</h2>
            <button @click="emit('close')" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
              <Icon name="ph:x-bold" size="15" />
            </button>
          </div>
          <div class="overflow-y-auto px-6 py-5 text-sm text-slate-700 space-y-5 leading-relaxed">
            <p class="text-xs text-slate-400 uppercase tracking-widest font-semibold">En vigueur pendant toute la durée d'activation du jeu</p>

            <section>
              <h3 class="font-black text-slate-900 mb-1">Article 1 — Organisateurs</h3>
              <p>Le jeu-concours sans obligation d'achat est organisé par :</p>
              <ul class="list-disc list-inside mt-1 space-y-1">
                <li><strong>{{ business?.name || 'Le commerçant' }}</strong> (ci-après « l'Organisateur »), établissement situé au Royaume du Maroc, responsable de l'opération commerciale et des lots ;</li>
                <li><strong>ScanUpGo</strong>, auto-entreprise de droit français (ci-après « la Plateforme »), intervenant exclusivement en qualité de prestataire technique pour la mise en œuvre numérique du jeu.</li>
              </ul>
              <p class="mt-1">Toute réclamation relative aux lots doit être adressée directement à l'Organisateur. ScanUpGo ne peut être tenu responsable des engagements commerciaux de l'Organisateur.</p>
            </section>

            <section>
              <h3 class="font-black text-slate-900 mb-1">Article 2 — Objet et durée</h3>
              <p>Le présent règlement régit le jeu-concours intitulé <strong>« {{ game?.title }} »</strong>, proposé par l'Organisateur à titre promotionnel, sans obligation d'achat ni contrepartie financière d'aucune sorte. Le jeu est actif pendant la période définie par l'Organisateur sur la Plateforme ; il peut être suspendu ou arrêté à tout moment par l'Organisateur.</p>
            </section>

            <section>
              <h3 class="font-black text-slate-900 mb-1">Article 3 — Conditions de participation</h3>
              <p>Le jeu est ouvert à toute personne physique majeure (18 ans ou plus), résidant au Royaume du Maroc, à l'exclusion :</p>
              <ul class="list-disc list-inside mt-1 space-y-0.5">
                <li>des salariés, collaborateurs et gérants de l'Organisateur ;</li>
                <li>des membres de leur famille directe (conjoint, ascendants, descendants) ;</li>
                <li>des collaborateurs de ScanUpGo.</li>
              </ul>
              <p class="mt-1">La participation est limitée à <strong>une (1) tentative par personne</strong> sur la durée du jeu. Toute tentative multiple détectée sera automatiquement invalidée sans recours possible.</p>
            </section>

            <section>
              <h3 class="font-black text-slate-900 mb-1">Article 4 — Modalités de participation</h3>
              <p>Pour participer, le joueur doit :</p>
              <ol class="list-decimal list-inside mt-1 space-y-1">
                <li>Scanner le QR code mis à disposition par l'Organisateur ;</li>
                <li>Laisser un avis sur Google (étape facultative — aucune note minimale n'est imposée ; le joueur peut passer cette étape) ;</li>
                <li>Renseigner les informations demandées (prénom, e-mail ou numéro de téléphone) ;</li>
                <li>Faire tourner la roue de la fortune pour découvrir son résultat.</li>
              </ol>
              <p class="mt-1">Le résultat est déterminé de façon aléatoire par la Plateforme selon les probabilités configurées par l'Organisateur. ScanUpGo ne peut être tenu responsable de la politique de gains retenue par l'Organisateur.</p>
            </section>

            <section>
              <h3 class="font-black text-slate-900 mb-1">Article 5 — Dotations</h3>
              <p>Les lots sont définis, fournis et remis exclusivement par l'Organisateur. La liste et la valeur indicative des lots sont disponibles sur demande auprès de l'Organisateur. ScanUpGo n'assume aucune responsabilité quant à la nature, la qualité, la disponibilité ou la remise des lots. Les lots sont strictement personnels : ils ne sont ni échangeables, ni remboursables, ni cessibles à un tiers.</p>
            </section>

            <section>
              <h3 class="font-black text-slate-900 mb-1">Article 6 — Remise des lots</h3>
              <p>En cas de gain, un code unique ou un QR code est remis au joueur via la Plateforme. Ce justificatif doit être présenté à l'Organisateur dans les délais affichés sur la page de résultat. Passé ce délai, le gain est définitivement perdu et ne pourra faire l'objet d'aucune réclamation. L'Organisateur se réserve le droit de vérifier l'identité du gagnant avant toute remise de lot.</p>
            </section>

            <section>
              <h3 class="font-black text-slate-900 mb-1">Article 7 — Responsabilité</h3>
              <p>L'Organisateur et ScanUpGo ne sauraient être tenus responsables de tout incident lié à une connexion internet défaillante, à un appareil incompatible, ou à toute circonstance indépendante de leur volonté. ScanUpGo se réserve le droit de suspendre, modifier ou annuler le jeu en cas de fraude avérée, d'abus, de force majeure ou de problème technique majeur, sans qu'aucune indemnité ne soit due aux participants.</p>
            </section>

            <section>
              <h3 class="font-black text-slate-900 mb-1">Article 8 — Protection des données personnelles</h3>
              <p>Les données collectées (prénom, e-mail, téléphone) sont traitées par l'Organisateur en qualité de responsable de traitement, aux fins de gestion du jeu et, sous réserve du consentement explicite du participant, à des fins de communication commerciale.</p>
              <p class="mt-1">Conformément à la <strong>loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel</strong> (Maroc / CNDP), le participant dispose d'un droit d'accès, de rectification et de suppression de ses données en contactant directement l'Organisateur.</p>
              <p class="mt-1">ScanUpGo, en tant qu'entité de droit français traitant des données pour le compte de l'Organisateur, intervient en qualité de sous-traitant au sens de l'article 28 du <strong>Règlement Général sur la Protection des Données (RGPD)</strong> et s'engage à traiter les données conformément aux instructions de l'Organisateur.</p>
            </section>

            <section>
              <h3 class="font-black text-slate-900 mb-1">Article 9 — Litiges et droit applicable</h3>
              <p>Tout litige relatif aux lots ou à l'opération commerciale est soumis au droit marocain et relève de la compétence des juridictions du lieu du siège de l'Organisateur au Maroc.</p>
              <p class="mt-1">Tout litige relatif à la Plateforme ScanUpGo est soumis au droit français et relève de la compétence des juridictions françaises.</p>
              <p class="mt-1">Toute réclamation doit être adressée par écrit à l'Organisateur dans un délai de <strong>30 jours</strong> suivant la fin du jeu.</p>
            </section>

            <section>
              <h3 class="font-black text-slate-900 mb-1">Article 10 — Contact</h3>
              <p>Pour toute question relative à ce jeu, contactez l'Organisateur directement en établissement ou ScanUpGo via <a href="https://scanupgo.com/contact" target="_blank" class="text-blue-600 underline">scanupgo.com/contact</a>.</p>
            </section>

            <p class="text-xs text-slate-400 pt-2 border-t border-slate-100">Plateforme technique fournie par ScanUpGo (auto-entreprise, France) — <a href="https://scanupgo.com" target="_blank" class="underline">scanupgo.com</a></p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
