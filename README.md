# 🛸 UAP Archive

Agrégateur communautaire de vidéos UAP/UFO avec système de vote pour faire remonter les observations les plus crédibles.

## Stack

- **Frontend** : React + Vite (hébergé sur Vercel)
- **Backend** : Supabase (PostgreSQL + Edge Functions)
- **Anti-bot** : Cloudflare Turnstile (captcha invisible)

## Déploiement étape par étape

### 1. Créer un projet Supabase

1. Va sur [supabase.com](https://supabase.com) et crée un compte
2. Clique sur "New Project"
3. Note bien ton **Project URL** et ta **anon key** (dans Settings > API)

### 2. Créer les tables dans Supabase

Va dans l'onglet **SQL Editor** de ton projet Supabase et exécute le contenu du fichier `supabase/schema.sql`.

### 3. Configurer Cloudflare Turnstile

1. Va sur [dash.cloudflare.com/turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Crée un nouveau site (mode "Managed")
3. Note ta **Site Key** et ta **Secret Key**

### 4. Configurer les variables d'environnement Supabase

Dans Supabase, va dans **Settings > Edge Functions** et ajoute :

```
TURNSTILE_SECRET_KEY=ta_secret_key_turnstile
```

### 5. Déployer les Edge Functions

Installe le CLI Supabase :

```bash
npm install -g supabase
supabase login
supabase link --project-ref TON_PROJECT_REF
supabase functions deploy verify-turnstile
supabase functions deploy submit-vote
supabase functions deploy submit-video
supabase functions deploy flag-video
```

### 6. Déployer le frontend sur Vercel

1. Fork ou push ce repo sur GitHub
2. Va sur [vercel.com](https://vercel.com) et importe le projet
3. Configure les variables d'environnement :

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA...
```

4. Deploy !

## Développement local

```bash
cd client
npm install
npm run dev
```

Crée un fichier `client/.env.local` :

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_TURNSTILE_SITE_KEY=xxx
```

## Configuration

### Seuil de flags pour suppression auto

Dans `supabase/schema.sql`, modifie la valeur dans la fonction `check_flags_threshold()` :

```sql
IF NEW.flag_count >= 10 THEN  -- Change ce nombre
```

### Protection des vidéos populaires

Les vidéos avec un score de crédibilité > 70% nécessitent 2x plus de flags pour être supprimées.

## Structure du projet

```
uap-archive/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── App.jsx         # Composant principal
│   │   ├── lib/
│   │   │   └── supabase.js # Client Supabase
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── supabase/
│   ├── schema.sql          # Structure de la base
│   └── functions/          # Edge Functions
│       ├── verify-turnstile/
│       ├── submit-vote/
│       ├── submit-video/
│       └── flag-video/
└── README.md
```

## License

MIT
