# ScanUpGo — App Dashboard

Application web marchands et admin de ScanUpGo, déployée sur [app.scanupgo.com](https://app.scanupgo.com).

## Stack

- **Nuxt 4** — framework Vue SSR
- **Pinia** — gestion d'état (auth, notifications…)
- **Tailwind CSS** — styles
- **@nuxtjs/i18n** — multilingue (FR / EN / AR avec RTL)
- **Stripe.js** — paiements
- **Tiptap** — éditeur rich text
- **Fabric.js** — éditeur canvas flyers
- **Playwright** — tests E2E

## Démarrage local

```bash
cp .env.example .env
# Remplir .env avec les vraies valeurs
npm install
npm run dev        # → http://localhost:3001
```

> Le backend doit tourner sur `http://localhost:4000`.
> Voir `backend/README.md` pour le démarrer.

## Variables d'environnement

| Variable       | Description                            | Défaut                    |
|----------------|----------------------------------------|---------------------------|
| `API_URL`      | URL de l'API backend NestJS            | `http://localhost:4000`   |
| `SITE_URL`     | URL de la landing (liens retour)       | `http://localhost:3000`   |

## Scripts

| Commande              | Description                          |
|-----------------------|--------------------------------------|
| `npm run dev`         | Serveur de développement (port 3001) |
| `npm run build`       | Build de production                  |
| `npm run preview`     | Prévisualisation du build            |
| `npm run test:e2e`    | Tests E2E Playwright                 |
| `npm run test:e2e:ui` | Tests E2E avec interface Playwright  |

## Déploiement

Déploiement automatique via **GitHub Actions → Vercel** à chaque push sur `master`.

Secrets GitHub requis : `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## Structure

```
app/
├── components/        # Composants réutilisables (flyers, game, orders…)
├── composables/       # Logique partagée (useAuth, useSubscription…)
├── layouts/           # auth, dashboard, admin, public
├── middleware/        # auth.ts, admin.ts
├── pages/
│   ├── dashboard/     # Pages marchands
│   ├── admin/         # Panel super-admin
│   └── play/          # Page publique jeu QR
├── plugins/           # api.ts (fetch avec session), jsqr.client.ts
└── stores/            # auth.ts (Pinia)
i18n/locales/          # Traductions FR / EN / AR
tests/                 # Tests E2E Playwright
```

## Authentification

L'auth est basée sur des **sessions cookie** (express-session + Redis côté backend).
Le plugin `$api` (plugins/api.ts) forward automatiquement les cookies en SSR.
