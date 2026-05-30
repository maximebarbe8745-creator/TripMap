# TripMap 🗺️

Application de voyage Asie — carte interactive, réservations, assistant IA.

---

## Étape 1 — Créer les tables Supabase

Dans votre projet Supabase → **SQL Editor** → copiez-collez ce code → cliquez **Run** :

```sql
create table places (
  id uuid default gen_random_uuid() primary key,
  name text,
  country text,
  city text,
  category text,
  lat float,
  lng float,
  note text,
  priority text default 'normal',
  thumbnail text,
  created_at timestamp default now()
);

create table reservations (
  id uuid default gen_random_uuid() primary key,
  type text,
  name text,
  platform text,
  date text,
  time text,
  end_date text,
  ref text,
  note text,
  country text,
  confirmed boolean default false,
  created_at timestamp default now()
);
```

---

## Étape 2 — Mettre le code sur GitHub

1. Allez sur **github.com** → connectez-vous
2. Cliquez **New repository** → nommez-le `tripmap` → cliquez **Create repository**
3. Sur la page du repo, cliquez **uploading an existing file**
4. Glissez-déposez TOUS les fichiers de ce dossier
5. Cliquez **Commit changes**

---

## Étape 3 — Déployer sur Vercel

1. Allez sur **vercel.com** → connectez-vous avec GitHub
2. Cliquez **Add New Project** → importez `tripmap`
3. Avant de cliquer Deploy, allez dans **Environment Variables** et ajoutez :

| Nom | Valeur |
|-----|--------|
| `REACT_APP_SUPABASE_URL` | `https://nmknuatpjpdhfsrliymn.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | `eyJhbGci...` *(votre clé anon complète)* |

4. Cliquez **Deploy** — attendez 2 minutes

✅ Vous avez une URL du style `tripmap-xxx.vercel.app` à partager avec votre copine !

---

## Partage avec votre copine

Envoyez-lui simplement l'URL Vercel. Tout ce qu'elle ajoute ou modifie apparaît chez vous en temps réel (synchronisation automatique via Supabase).

---

## Structure des fichiers

```
tripmap/
├── public/
│   └── index.html
├── src/
│   ├── App.js        ← Application principale
│   ├── index.js      ← Point d'entrée
│   └── supabase.js   ← Connexion base de données
├── .env              ← Vos clés (NE PAS partager ce fichier)
├── package.json
└── README.md
```
