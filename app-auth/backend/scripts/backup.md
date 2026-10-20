# Sauvegarde et restauration de la base de données

## Pourquoi ce fichier existe

Sur Render, la base PostgreSQL **du plan gratuit expire 30 jours après sa
création**. Passé ce délai, Render supprime la base et **toutes les données
des utilisateurs disparaissent**.

Il faut donc savoir :

1. **Exporter** (sauvegarder) les données de la base actuelle,
2. **Créer une nouvelle base** sur Render,
3. **Restaurer** les données dans la nouvelle base.

C'est exactement ce que font les commandes de ce document.

> Astuce : pensez à exporter la base **au moins une fois par semaine**, ou
> avant la date d'expiration (Render l'affique dans le dashboard de la base).

---

## Rappel des commandes

| Action | Outil | But |
|---|---|---|
| Exporter | `pg_dump` | Copie la base vers un fichier |
| Restaurer | `psql` ou `pg_restore` | Recopie le fichier dans une base |

Ces commandes font partie de PostgreSQL. Sur votre machine, installez
PostgreSQL (<https://www.postgresql.org/download/windows/> par exemple) ou
utilisez le **Render Shell** (onglet "Shell" du web service).

Pour récupérer l'URL de la base, copiez la variable `DATABASE_URL` de votre
fichier `.env`, ou l'**Internal Database URL** affichée dans le dashboard
Render de la base.

---

## 1. Exporter la base (pg_dump)

### Format SQL classique (lisible, idéal pour un étudiant)

```bash
# Linux / macOS / Git Bash / Render Shell
pg_dump "$DATABASE_URL" --no-owner --no-privileges > sauvegarde.sql
```

```powershell
# Windows PowerShell
$env:DATABASE_URL = "postgres://....."   # coller l'URL de Render
pg_dump $env:DATABASE_URL --no-owner --no-privileges -f sauvegarde.sql
```

Explication des options :

- `--no-owner` : n'écrit pas les instructions `OWNER TO` (sinon la
  restauration échoue si l'utilisateur n'existe pas dans la nouvelle base).
- `--no-privileges` : n'écrit pas les droits (`GRANT`), inutiles ici.

### Format binaire (plus compact, recommandé pour les grosses bases)

```bash
pg_dump "$DATABASE_URL" --no-owner --no-privileges -Fc -f sauvegarde.dump
```

`-Fc` = format compressé personnalisé. Ce fichier se restaure avec
`pg_restore` (voir plus bas).

### Vérifier la sauvegarde

```bash
# Le fichier doit contenir des lignes du type :
#   COPY public.users (id, nom, email, password, created_at) FROM stdin;
head -n 30 sauvegarde.sql
grep -c "COPY public.users" sauvegarde.sql
```

---

## 2. Créer la nouvelle base sur Render

1. Aller dans le dashboard Render → **New** → **PostgreSQL** → plan **Free**.
2. Attendre que le statut passe à **Available**.
3. Copier l'**Internal Database URL** (utilisée par le web service déployé
   sur Render, réseau interne, gratuite et rapide).
4. **Noter la date d'expiration** affichée sur la carte de la base.

La nouvelle base est **vide**. Pas de panique : au démarrage, le backend
exécute automatiquement `CREATE TABLE IF NOT EXISTS users`, donc la table
sera recréée toute seule. Il ne manque que les **données**.

---

## 3. Restaurer les données dans la nouvelle base

### Avec un fichier .sql (format classique)

```bash
# Linux / macOS / Git Bash / Render Shell
psql "NOUVELLE_DATABASE_URL" < sauvegarde.sql
```

```powershell
# Windows PowerShell
$env:DATABASE_URL = "postgres://....."   # la NOUVELLE URL
Get-Content sauvegarde.sql | psql $env:DATABASE_URL
```

### Avec un fichier .dump (format -Fc)

```bash
pg_restore --no-owner --no-privileges -d "NOUVELLE_DATABASE_URL" sauvegarde.dump
```

### Vérifier que tout est là

```bash
psql "NOUVELLE_DATABASE_URL" -c "SELECT id, nom, email, created_at FROM users ORDER BY id;"
```

Vous devez voir la liste des utilisateurs exportés.

---

## 4. Mettre à jour le backend

Une fois la restauration faite :

1. Sur Render, aller dans le **web service** backend → **Environment**.
2. Remplacer la valeur de `DATABASE_URL` par la **nouvelle** Internal URL.
3. Cliquer sur **Save** (Render redémarre le service automatiquement).
4. Tester : `GET /` doit répondre, et les utilisateurs doivent pouvoir se
   reconnecter avec leur ancien mot de passe.

---

## 5. Automatiser la sauvegarde (optionnel)

### Avec cron (Linux)

```bash
# Modifier les droits d'accès à la sauvegarde
chmod 600 ~/sauvegardes/*

# Ouvrir la planification
crontab -e

# Ajouter une ligne : sauvegarde chaque nuit à 2h
0 2 * * * pg_dump "$DATABASE_URL" --no-owner --no-privileges -Fc -f ~/sauvegardes/base-$(date +\%F).dump
```

### Avec Windows Task Scheduler

Créer un fichier `sauvegarde.bat` :

```bat
@echo off
set DATABASE_URL=postgres://.....
pg_dump %DATABASE_URL% --no-owner --no-privileges -Fc -f "C:\sauvegardes\base-%date:~6,4%-%date:~3,2%-%date:~0,2%.dump"
```

Puis planifier ce fichier dans le **Planificateur de tâches** de Windows.

---

## Erreurs fréquentes

| Message | Cause | Solution |
|---|---|---|
| `connection refused` | Mauvaise URL ou base suspendue | Vérifier `DATABASE_URL` et que la base est **Available** |
| `no password supplied` | URL sans mot de passe | Utiliser l'URL complète fournie par Render |
| `database "xxx" does not exist` | Nom de base incorrect | Copier l'URL exacte depuis le dashboard Render |
| `ERROR: role "postgres" does not exist` | URL d'une autre plateforme | Vérifier l'utilisateur de la base cible |
| `permission denied for schema public` | Restauration sans droits | Relancer avec `--no-owner --no-privileges` |

---

## Résumé en 4 commandes

```bash
# 1. Sauvegarder l'ancienne base
pg_dump "$ANCIENNE_URL" --no-owner --no-privileges -Fc -f sauvegarde.dump

# 2. Créer la nouvelle base sur Render (dashboard), puis :
# 3. Restaurer
pg_restore --no-owner --no-privileges -d "$NOUVELLE_URL" sauvegarde.dump

# 4. Mettre à jour DATABASE_URL dans Render → Environment → Save
```
