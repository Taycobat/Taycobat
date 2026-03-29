import { Link } from 'react-router-dom'

export default function MentionsLegales() {
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
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Mentions legales</h1>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Editeur du site</h2>
          <div className="text-sm text-gray-600 leading-relaxed space-y-1">
            <p><strong>TAYCO SAS</strong></p>
            <p>Site internet : taycobat.fr</p>
            <p>Email : contact@taycobat.fr</p>
            <p>Directeur de la publication : Taylan Coban</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Hebergement</h2>
          <div className="text-sm text-gray-600 leading-relaxed space-y-1">
            <p><strong>Frontend</strong> : Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
            <p><strong>Backend & base de donnees</strong> : Supabase Inc. — Region EU (Francfort)</p>
            <p><strong>Paiements</strong> : Stripe Payments Europe Ltd. — Dublin, Irlande</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Propriete intellectuelle</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            L'ensemble du contenu de ce site (textes, images, logos, code source) est protege par le droit
            de la propriete intellectuelle. Toute reproduction, meme partielle, est interdite sans autorisation
            prealable ecrite de TAYCO SAS.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Donnees personnelles</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Le traitement des donnees personnelles est detaille dans notre{' '}
            <Link to="/politique-confidentialite" className="text-[#1a9e52] underline">politique de confidentialite</Link>.
            Conformement au RGPD, vous disposez d'un droit d'acces, de rectification et de suppression
            de vos donnees en ecrivant a contact@taycobat.fr.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Cookies</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Ce site utilise des cookies essentiels au fonctionnement et des cookies analytiques optionnels.
            Vous pouvez gerer vos preferences via le bandeau cookies affiche lors de votre premiere visite.
            Conformement aux recommandations de la CNIL, les cookies ont une duree de vie maximale de 13 mois.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Droit applicable</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Le present site est soumis au droit francais. En cas de litige, les tribunaux francais
            seront seuls competents.
          </p>
        </section>
      </article>
    </div>
  )
}
