# CLAUDE.md — Instructions permanentes pour TAYCOBAT

Tu es l'assistant développeur principal de TAYCOBAT, un logiciel SaaS BTP multilingue.

## Stack technique

- Vite + React 19 + TypeScript + Tailwind CSS v4
- Zustand (state), React Router (routing), Framer Motion (animations)
- Supabase (auth + database), jsPDF (PDF generation), Recharts (graphiques)
- Déployé sur Vercel : taycobat.vercel.app
- Repo GitHub : https://github.com/Taycobat/Taycobat (branche main)

## Supabase

- URL : https://uwdfytuvpujhiniotqyl.supabase.co
- Tables principales : devis, devis_lignes, clients, factures, chantiers, sous_traitants, audit_log
- Toujours filtrer par `user_id` de l'utilisateur connecté
- Colonnes devis : id, numero, titre, client_id, montant_ht, montant_ttc, tva_pct, statut, date_devis, date_validite, user_id, created_at
- Colonnes devis_lignes : id, devis_id, description, quantite, unite, prix_unitaire, total_ht, ordre, tva_pct
- Colonnes clients : id, user_id, nom, prenom, email, telephone, adresse, ville, code_postal, siret, entreprise, type_client, raison_sociale, nom_contact, tva_intracom, adresse_chantier, ville_chantier, code_postal_chantier, notes, created_at
- Colonnes factures : id, user_id, numero, client_id, devis_id, type, montant_ht, montant_ttc, tva_pct, statut, date_emission, date_echeance, avancement_pct, retenue_garantie_pct, avoir_facture_id, date_paiement, mode_paiement, montant_paye, created_at

## RÈGLES ABSOLUES

1. Après chaque modification, vérifie automatiquement que tout compile sans erreur (`npm run build`)
2. Vérifie que toutes les colonnes utilisées dans le code existent dans Supabase avant d'écrire le code
3. Si une colonne manque dans Supabase, génère le SQL `ALTER TABLE` nécessaire et demande-moi de l'exécuter — ne jamais inventer des colonnes
4. Après chaque session de travail, pousse automatiquement sur GitHub (`git push origin main`)
5. Signale proactivement tout bug potentiel que tu détectes même si je ne l'ai pas mentionné
6. Quand tu corriges un bug, vérifie les 5 fichiers liés pour éviter les bugs en cascade
7. Le dashboard doit toujours afficher les vraies données Supabase — jamais de données fictives
8. Les KPIs du dashboard viennent toujours de la table factures — jamais des devis
9. Design toujours cohérent vert #1a9e52 sur toutes les pages
10. Chaque modification doit être testable immédiatement sur taycobat.vercel.app

## Conventions code

- Hooks Supabase dans `src/hooks/` — toujours `select()` avec colonnes explicites ou `select('*')` si toutes nécessaires
- Toujours parser les montants avec `toNum()` — Supabase peut renvoyer des strings
- Noms de factures : FA- (facture), AC- (acompte), SI- (situation), SO- (solde), AV- (avoir)
- Noms de devis : DE-YYYY-XXXX
- Ne jamais supprimer une facture — créer un avoir à la place
- Couleur primaire : #1a9e52, gradient : from-[#1a9e52] to-[#0e7a3c]
- Font : Outfit (via Tailwind system-ui fallback)
