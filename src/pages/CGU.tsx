import { Link } from 'react-router-dom'

export default function CGU() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 h-16 flex items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1a9e52] rounded-xl flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <span className="font-bold text-gray-900">TAYCOBAT</span>
        </Link>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Conditions generales d'utilisation</h1>
        <p className="text-sm text-gray-400 mb-8">Derniere mise a jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Objet</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Les presentes CGU regissent l'utilisation du service TAYCOBAT, logiciel SaaS de gestion
            pour les entreprises du batiment et des travaux publics, edite par TAYCO SAS.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Acces au service</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            L'acces au service necessite la creation d'un compte avec une adresse email valide.
            Un essai gratuit de 14 jours est propose sans engagement ni carte bancaire.
            Au-dela, un abonnement payant (Solo, Pro ou Business) est requis.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Abonnement et paiement</h2>
          <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
            <li>Les prix sont indiques en euros TTC sur la page <Link to="/tarifs" className="text-[#1a9e52] underline">Tarifs</Link>.</li>
            <li>Le paiement est effectue par carte bancaire via Stripe, plateforme certifiee PCI-DSS.</li>
            <li>L'abonnement est reconduit automatiquement (mensuel ou annuel selon le choix).</li>
            <li>Vous pouvez annuler a tout moment. L'acces reste actif jusqu'a la fin de la periode payee.</li>
            <li>Aucun remboursement n'est effectue pour une periode entamee.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Utilisation du service</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">L'utilisateur s'engage a :</p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
            <li>Fournir des informations exactes lors de l'inscription</li>
            <li>Ne pas utiliser le service a des fins illegales ou frauduleuses</li>
            <li>Garder confidentiels ses identifiants de connexion</li>
            <li>Respecter les droits de propriete intellectuelle de TAYCOBAT</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Donnees et propriete</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Vous restez proprietaire de toutes les donnees que vous saisissez dans TAYCOBAT
            (clients, devis, factures). Nous ne les utilisons que pour fournir le service.
            Vous pouvez exporter vos donnees a tout moment (export FEC, PDF).
            En cas de resiliation, vos donnees sont conservees 30 jours puis supprimees.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. IA Audio</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            La fonctionnalite IA Audio utilise des services tiers (OpenAI) pour la transcription vocale.
            Les enregistrements audio sont transmis de maniere securisee, traites, puis supprimes immediatement.
            Aucun enregistrement n'est conserve par TAYCOBAT ni par ses sous-traitants.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Disponibilite</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            TAYCOBAT s'engage a fournir un service disponible 99,9% du temps.
            Des interruptions pour maintenance peuvent survenir, avec notification prealable
            lorsque possible. TAYCOBAT ne saurait etre tenu responsable des dommages
            resultant d'une indisponibilite temporaire du service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Responsabilite</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            TAYCOBAT fournit un outil de gestion. La responsabilite de l'exactitude des devis,
            factures et documents generes incombe a l'utilisateur. TAYCOBAT ne peut etre tenu
            responsable d'erreurs de saisie ou d'utilisation inappropriee du service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Modification des CGU</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            TAYCO SAS se reserve le droit de modifier les presentes CGU. Les utilisateurs seront
            informes par email de toute modification substantielle. La poursuite de l'utilisation
            du service vaut acceptation des CGU modifiees.
          </p>
        </section>
      </article>
    </div>
  )
}
