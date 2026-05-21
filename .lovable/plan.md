# Plateforme DJ : soumissions + validation admin

## Vue d'ensemble

Chaque utilisateur peut devenir « DJ » et soumettre des morceaux depuis son dashboard. Toute soumission ou modification entre en file d'attente et doit être validée par l'admin avant publication publique. L'admin peut corriger les métadonnées avant d'approuver. Notifications in-app temps réel.

## 1. Base de données

### Modifs sur `tracks`
- `status` : `pending` | `approved` | `rejected` (par défaut `pending`, sauf imports admin → `approved`)
- `submitted_by` : uuid du DJ propriétaire
- `rejection_reason` : texte (motif de refus)
- `reviewed_by`, `reviewed_at`
- Affichage public filtré sur `status = 'approved'`

### Nouvelle table `track_revisions`
Stocke les modifications proposées par un DJ sur un morceau déjà approuvé (pour ne pas écraser le live tant que non validé).
- `track_id`, `submitted_by`, `payload` (jsonb avec champs modifiés + cover/audio temporaires)
- `status` (pending/approved/rejected), `rejection_reason`
- À l'approbation : merge dans `tracks` + suppression de la revision

### Nouvelle table `notifications`
- `user_id`, `type` (`submission_received`, `submission_approved`, `submission_rejected`, `new_pending_submission`)
- `title`, `body`, `link`, `read_at`, `data` jsonb
- Realtime activé

### Rôle `dj`
Ajout à l'enum `app_role`. Attribué automatiquement à la 1ʳᵉ soumission. Helper `has_role(uid, 'dj')`.

### RLS clés
- `tracks` public : `SELECT WHERE status = 'approved' OR submitted_by = auth.uid() OR is_admin`
- DJs : `INSERT WHERE submitted_by = auth.uid()` + `UPDATE/DELETE WHERE submitted_by = auth.uid() AND status = 'pending'`
- Admins : tous droits
- `track_revisions` : DJ voit/insère les siennes, admin tout
- `notifications` : utilisateur voit/marque les siennes ; admin insère pour autrui via fonction security definer

### Triggers
- À l'insert d'un track avec `status=pending` → notifier tous les admins (`new_pending_submission`)
- À l'update de `status` → notifier le DJ propriétaire (`submission_approved` / `submission_rejected`)

## 2. Espace DJ (`/dj/*`)

- `/dj` Dashboard : compteurs (en attente, approuvés, refusés, total téléchargements de mes tracks), liste des notifications récentes
- `/dj/tracks` Mes soumissions : table avec statut, recherche, filtre par statut
- `/dj/upload` Nouveau morceau (réutilise `TrackForm` existant)
- `/dj/edit/:id` Modifier (création de revision si déjà approuvé, édition directe si pending)
- Bouton « Supprimer » disponible uniquement sur pending/rejected

## 3. Admin — modération

- Nouvelle page `/admin/queue` : file d'attente unifiée (nouveaux + revisions), tri par date, filtres par DJ/statut/type
- Détail soumission : preview audio + cover + toutes métadonnées **éditables** (titre, artiste, genre, BPM, key, version, label, tags, cover, date)
- Actions : **Approuver** (avec corrections appliquées), **Refuser** (motif obligatoire), **Modifier et renvoyer** au DJ
- Badge compteur dans la sidebar admin avec le nombre de pending (realtime)
- Historique : `/admin/audit` affiche déjà ça → ajout des events `track_approved` / `track_rejected`

## 4. Notifications

- Cloche dans le header (`NotificationBell.tsx`) avec compteur non-lus + dropdown des 10 dernières
- Subscription realtime via Supabase channel sur `notifications WHERE user_id = me`
- Marquage `read_at` au clic
- Toast Sonner sur nouvelle notification reçue en live

## 5. Workflow

```text
DJ upload                          Admin
    │                                │
    ├─ INSERT track (pending) ──────▶│
    │                                ├─ notif "new_pending"
    │  notif "submission_received"   │
    │◀── (auto via trigger)          │
    │                                ├─ corrige métas si besoin
    │                                ├─ Approve → status=approved
    │  notif "approved" ◀────────────┤   (visible publiquement)
    │                                │
    │                                └─ Reject → status=rejected
    │  notif "rejected" + motif ◀────┘
    │
    └─ Modifier track approuvé
       → crée track_revision (pending)
       → admin l'approuve → merge dans tracks
```

## 6. Détails techniques

- `tracks` public listing (`useTracks`, NewReleases, Index) filtré sur `status = 'approved'`
- `AdminTracks` montre **tous** les tracks (avec badge statut)
- `admin_upsert_track` RPC ajustée pour pouvoir setter `status` (admin) ; nouveau RPC `dj_submit_track` qui force status=pending et submitted_by=auth.uid()
- Nouveau RPC `admin_review_track(_id, _decision, _reason, _patch jsonb)` qui applique le patch + change le statut + écrit l'audit
- Sidebar : 2 nouveaux items (`/dj`, `/admin/queue`)
- Routes protégées : `/dj/*` exige user connecté ; `/admin/queue` exige admin

## 7. Hors scope (peut venir après)

- Notifications email (pour plus tard, Lovable Email)
- Système de versions/historique complet de chaque track
- Commentaires de revue (chat admin↔DJ)
- Stats publiques sur les profils DJ

## 8. Livraison

À cause de la taille, je propose de livrer en **2 vagues** :

**Vague 1 (cette demande)** : schéma + RLS + status tracks + dashboard DJ + page admin de modération + notifications in-app + filtrage public des tracks approuvés.

**Vague 2 (à demander ensuite)** : revisions séparées (modifs de tracks approuvés), notifications email, historique enrichi.

Confirme « ok » et je lance la vague 1.
