import { Link } from 'react-router-dom'

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 h-16 flex items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1a9e52] rounded-xl flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <span className="font-bold text-gray-900">TAYCO BAT</span>
        </Link>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-12 prose prose-sm prose-gray">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Politique de confidentialite</h1>
        <p className="text-sm text-gray-400 mb-8">Derniere mise a jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">1. Responsable du traitement</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          TAYCO BAT, edite par TAYCO SAS<br />
          Email : contact@taycobat.fr<br />
          Site : taycobat.fr
        </p>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">2. Donnees collectees</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-2">Nous collectons les donnees suivantes :</p>
        <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc pl-5">
          <li><strong>Donnees d'identification</strong> : nom, prenom, email, telephone</li>
          <li><strong>Donnees professionnelles</strong> : entreprise, SIRET, adresse</li>
          <li><strong>Donnees de facturation</strong> : devis, factures, montants (stockes dans Supabase EU)</li>
          <li><strong>Donnees de paiement</strong> : gerees exclusivement par Stripe (PCI-DSS)</li>
          <li><strong>Donnees techniques</strong> : adresse IP, navigateur, cookies</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">3. Finalites du traitement</h2>
        <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc pl-5">
          <li>Gestion de votre compte et acces au service</li>
          <li>Creation et gestion de vos devis et factures</li>
          <li>Gestion des abonnements et paiements via Stripe</li>
          <li>Envoi d'emails transactionnels (bienvenue, devis, relances)</li>
          <li>Amelioration du service et support technique</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">4. Base legale</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Le traitement est fonde sur : l'execution du contrat (article 6.1.b du RGPD),
          votre consentement pour les cookies non essentiels (article 6.1.a),
          et notre interet legitime pour l'amelioration du service (article 6.1.f).
        </p>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">5. Duree de conservation</h2>
        <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc pl-5">
          <li>Donnees de compte : duree de l'abonnement + 3 ans</li>
          <li>Factures et devis : 10 ans (obligation legale)</li>
          <li>Cookies : 13 mois maximum (recommandation CNIL)</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">6. Sous-traitants</h2>
        <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc pl-5">
          <li><strong>Supabase</strong> (hebergement EU, base de donnees)</li>
          <li><strong>Vercel</strong> (hebergement frontend)</li>
          <li><strong>Stripe</strong> (paiements, certifie PCI-DSS)</li>
          <li><strong>Resend</strong> (envoi d'emails transactionnels)</li>
          <li><strong>OpenAI</strong> (transcription audio IA)</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">7. Vos droits</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-2">
          Conformement au RGPD, vous disposez des droits suivants :
        </p>
        <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc pl-5">
          <li>Droit d'acces, de rectification et d'effacement</li>
          <li>Droit a la portabilite des donnees</li>
          <li>Droit d'opposition et de limitation du traitement</li>
          <li>Droit de retirer votre consentement a tout moment</li>
        </ul>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Pour exercer vos droits : <strong>contact@taycobat.fr</strong><br />
          Vous pouvez egalement saisir la CNIL : <a href="https://www.cnil.fr" className="text-[#1a9e52]">www.cnil.fr</a>
        </p>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">8. Cookies</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Nous utilisons des cookies essentiels (authentification, preferences) et des cookies analytiques (optionnels).
          Vous pouvez modifier vos preferences a tout moment via le bandeau cookies.
        </p>
      </article>
    </div>
  )
}
