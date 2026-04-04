import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { DELAY_OPTIONS, METHOD_OPTIONS, PENALTY_OPTIONS, DEFAULT_SETTINGS, getDelayText, getMethodsText, getPenaltyText, loadCompanySettings, saveCompanySettings, type CompanyPaymentSettings, type PaymentDelayType, type PenaltyType, type PaymentMethod } from '../lib/paymentConditions'
import { uploadFile } from '../lib/storage'
import { searchSiret } from '../lib/siret'
import { getPlanComptable, PLAN_DEFAUT, PLAN_FIELDS, type PlanComptable } from '../lib/planComptable'
import { useNavigate } from 'react-router-dom'

export default function Parametres() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const meta = user?.user_metadata ?? {}
  const [prenom, setPrenom] = useState(meta.prenom || '')
  const [nom, setNom] = useState(meta.nom || '')
  const [entreprise, setEntreprise] = useState(meta.entreprise || '')
  const [formeJuridique, setFormeJuridique] = useState(meta.forme_juridique || '')
  const [siret, setSiret] = useState(meta.siret || '')
  const [tvaIntracom, setTvaIntracom] = useState(meta.tva_intracom || '')
  const [rcs, setRcs] = useState(meta.rcs || '')
  const [capitalSocial, setCapitalSocial] = useState(meta.capital_social || '')
  const [adresse, setAdresse] = useState(meta.adresse || '')
  const [telephone, setTelephone] = useState(meta.telephone || '')
  const [emailPro, setEmailPro] = useState(meta.email_pro || '')
  const [iban, setIban] = useState(meta.iban || '')
  const [searching, setSearching] = useState(false)

  // Company payment settings
  const [paySettings, setPaySettings] = useState<CompanyPaymentSettings>({ ...DEFAULT_SETTINGS })
  useEffect(() => { if (user) loadCompanySettings(user.id).then(setPaySettings) }, [user])
  const [siretFound, setSiretFound] = useState(false)

  // Plan comptable
  const [planComptable, setPlanComptable] = useState<PlanComptable>(() => getPlanComptable(meta))
  const [pcSaved, setPcSaved] = useState(false)

  // Expert-comptable
  const [emailExpert, setEmailExpert] = useState(meta.email_expert || '')
  const [inviting, setInviting] = useState(false)
  const [invited, setInvited] = useState(false)

  async function handleSiretSearch() {
    if (!siret || siret.replace(/\s/g, '').length < 9) return
    setSearching(true); setSiretFound(false)
    const r = await searchSiret(siret)
    if (r) {
      if (r.raisonSociale) setEntreprise(r.raisonSociale)
      if (r.formeJuridique) setFormeJuridique(r.formeJuridique)
      if (r.adresse) setAdresse(r.adresse)
      if (r.siret) setSiret(r.siret)
      if (r.tvaIntracom) setTvaIntracom(r.tvaIntracom)
      if (r.rcs) setRcs(r.rcs)
      if (r.capitalSocial) setCapitalSocial(r.capitalSocial)
      setSiretFound(true)
      setTimeout(() => setSiretFound(false), 4000)
    }
    setSearching(false)
  }
  const [photoUrl, setPhotoUrl] = useState(meta.photo_url || '')
  const [logoUrl, setLogoUrl] = useState(meta.logo_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const path = `photos/artisan_${user.id}_${Date.now()}.${file.name.split('.').pop()}`
    const url = await uploadFile(path, file)
    if (url) setPhotoUrl(url)
    setUploading(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const path = `logos/artisan_${user.id}_${Date.now()}.${file.name.split('.').pop()}`
    const url = await uploadFile(path, file)
    if (url) setLogoUrl(url)
    setUploading(false)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase.auth.updateUser({ data: {
      prenom, nom, entreprise, forme_juridique: formeJuridique, siret, tva_intracom: tvaIntracom,
      rcs, capital_social: capitalSocial, adresse, telephone, email_pro: emailPro,
      iban, photo_url: photoUrl, logo_url: logoUrl,
    } })
    await saveCompanySettings(user.id, paySettings)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const ic = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]'
  const lb = 'block text-xs font-semibold text-gray-400 uppercase mb-1.5'

  return (
    <div className="p-8 max-w-[800px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-0.5">Profil et informations de l'entreprise</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900">Informations personnelles</h2>

        {/* Photo profil */}
        <div className="flex items-center gap-5">
          {photoUrl ? (
            <img src={photoUrl} alt="Photo" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1E40AF] to-blue-400 flex items-center justify-center text-white font-bold text-xl">
              {(prenom || nom || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            <button type="button" onClick={() => photoRef.current?.click()} disabled={uploading}
              className="text-sm font-medium text-[#1E40AF] hover:text-blue-700 cursor-pointer disabled:opacity-50">
              {uploading ? 'Upload...' : photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            <p className="text-[11px] text-gray-400 mt-0.5">Visible sur vos devis et factures PDF</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Prénom</label>
            <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]" /></div>
          <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Nom</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]" /></div>
        </div>
        <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Téléphone</label>
          <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]" /></div>
        <div><label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Email</label>
          <input type="email" value={user?.email ?? ''} disabled className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-500" /></div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900">Entreprise</h2>

        {/* Logo entreprise */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Logo de mon entreprise</label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-gray-200 bg-white p-1" />
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              </div>
            )}
            <div>
              <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading}
                className="text-sm font-medium text-[#1E40AF] hover:text-blue-700 cursor-pointer disabled:opacity-50">
                {uploading ? 'Upload...' : logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
              </button>
              <p className="text-[11px] text-gray-400 mt-0.5">Affiche sur vos devis et factures PDF</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={lb}>Nom de l'entreprise</label>
            <input type="text" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} className={ic} /></div>
          <div><label className={lb}>Forme juridique</label>
            <select value={formeJuridique} onChange={(e) => setFormeJuridique(e.target.value)} className={ic}>
              <option value="">-- Choisir --</option>
              {['Auto-entrepreneur', 'EI', 'EIRL', 'EURL', 'SARL', 'SAS', 'SASU', 'SCI', 'SA'].map((f) => <option key={f} value={f}>{f}</option>)}
            </select></div>
        </div>
        <div><label className={lb}>Adresse complete</label>
          <input type="text" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="12 rue des Artisans, 75001 Paris" className={ic} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={lb}>SIRET / SIREN</label>
            <div className="flex gap-2">
              <input type="text" value={siret} onChange={(e) => setSiret(e.target.value)} maxLength={17} placeholder="123 456 789 00012" className={ic + ' font-mono flex-1'} />
              <button type="button" onClick={handleSiretSearch} disabled={searching || siret.replace(/\s/g, '').length < 9}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-[#1E40AF] hover:bg-blue-700 rounded-xl transition-colors cursor-pointer disabled:opacity-40 flex-shrink-0 flex items-center gap-2">
                {searching ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                )}
                Rechercher
              </button>
            </div>
            {siretFound ? (
              <p className="text-[11px] text-[#1E40AF] font-semibold mt-1">Informations trouvees — champs pre-remplis</p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-1">Entrez votre SIRET et cliquez Rechercher pour pre-remplir automatiquement</p>
            )}
          </div>
          <div><label className={lb}>N° TVA intracommunautaire</label>
            <input type="text" value={tvaIntracom} onChange={(e) => setTvaIntracom(e.target.value)} placeholder="FR12345678901" className={ic + ' font-mono'} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={lb}>RCS (ville d'immatriculation)</label>
            <input type="text" value={rcs} onChange={(e) => setRcs(e.target.value)} placeholder="Paris B 123 456 789" className={ic} /></div>
          <div><label className={lb}>Capital social</label>
            <input type="text" value={capitalSocial} onChange={(e) => setCapitalSocial(e.target.value)} placeholder="10 000 EUR" className={ic} /></div>
        </div>
        <div><label className={lb}>Email professionnel (affiche sur PDF)</label>
          <input type="email" value={emailPro} onChange={(e) => setEmailPro(e.target.value)} placeholder="contact@monentreprise.fr" className={ic} /></div>
      </motion.div>

      {/* Facturation & conditions de reglement */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900">Facturation & paiement</h2>
        <div><label className={lb}>IBAN / RIB</label>
          <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="FR76 1234 5678 9012 3456 7890 123" className={ic + ' font-mono'} /></div>

        {/* Conditions de reglement */}
        <div className="border border-gray-200 rounded-xl p-5 space-y-5">
          <h3 className="text-sm font-semibold text-gray-900">Conditions de reglement</h3>

          {/* Delai */}
          <div>
            <label className={lb}>Delai de paiement par defaut</label>
            <select value={paySettings.payment_delay_type} onChange={(e) => setPaySettings((s) => ({ ...s, payment_delay_type: e.target.value as PaymentDelayType }))} className={ic}>
              {DELAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {paySettings.payment_delay_type === 'custom' && (
            <div>
              <label className={lb}>Nombre de jours</label>
              <input type="number" min={0} max={60} value={paySettings.payment_delay_days} onChange={(e) => setPaySettings((s) => ({ ...s, payment_delay_days: parseInt(e.target.value) || 0 }))} className={ic + ' w-32'} />
            </div>
          )}

          {/* Modes de paiement */}
          <div>
            <label className={lb}>Modes de paiement acceptes</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {METHOD_OPTIONS.map((m) => (
                <label key={m.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="checkbox" checked={paySettings.payment_methods.includes(m.value)}
                    onChange={(e) => setPaySettings((s) => ({
                      ...s,
                      payment_methods: e.target.checked
                        ? [...s.payment_methods, m.value]
                        : s.payment_methods.filter((v) => v !== m.value),
                    }))}
                    className="w-4 h-4 rounded border-gray-300 text-[#1E40AF] focus:ring-[#1E40AF]/20" />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {/* Penalites */}
          <div>
            <label className={lb}>Penalites de retard</label>
            <select value={paySettings.late_penalty_type} onChange={(e) => setPaySettings((s) => ({ ...s, late_penalty_type: e.target.value as PenaltyType }))} className={ic}>
              {PENALTY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {paySettings.late_penalty_type === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lb}>Taux (%)</label>
                <input type="number" min={0} step={0.1} value={paySettings.late_penalty_rate} onChange={(e) => setPaySettings((s) => ({ ...s, late_penalty_rate: parseFloat(e.target.value) || 0 }))} className={ic + ' w-32'} /></div>
              <div><label className={lb}>Indemnite recouvrement (EUR)</label>
                <input type="number" min={0} value={paySettings.late_recovery_fee} onChange={(e) => setPaySettings((s) => ({ ...s, late_recovery_fee: parseInt(e.target.value) || 40 }))} className={ic + ' w-32'} /></div>
            </div>
          )}

          {/* Apercu legal */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Apercu mention legale</div>
            <p className="text-xs text-gray-600 leading-relaxed">{getDelayText(paySettings.payment_delay_type, paySettings.payment_delay_days)}</p>
            {paySettings.payment_methods.length > 0 && <p className="text-xs text-gray-600 leading-relaxed">{getMethodsText(paySettings.payment_methods)}</p>}
            <p className="text-xs text-gray-500 leading-relaxed italic">{getPenaltyText(paySettings.late_penalty_type, paySettings.late_penalty_rate, paySettings.late_recovery_fee)}</p>
          </div>
        </div>

        {saved && <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">Parametres sauvegardes</div>}

        <motion.button onClick={handleSave} disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 bg-[#1E40AF] hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-colors disabled:opacity-60 cursor-pointer">
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </motion.button>
      </motion.div>

      {/* Plan comptable */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Plan comptable</h2>
            <p className="text-xs text-gray-400 mt-0.5">Personnalisez les comptes pour vos exports FEC et rapports</p>
          </div>
          <button type="button" onClick={() => { setPlanComptable({ ...PLAN_DEFAUT }); setPcSaved(false) }}
            className="text-xs font-medium text-gray-400 hover:text-gray-600 cursor-pointer">Reinitialiser</button>
        </div>

        {(() => {
          const groups = [...new Set(PLAN_FIELDS.map((f) => f.group))]
          return groups.map((g) => (
            <div key={g}>
              <p className="text-xs font-semibold text-[#1E40AF] uppercase tracking-wider mb-2">{g}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLAN_FIELDS.filter((f) => f.group === g).map((f) => (
                  <div key={f.key}>
                    <label className={lb}>{f.label}</label>
                    <input type="text" value={planComptable[f.key]} onChange={(e) => setPlanComptable((p) => ({ ...p, [f.key]: e.target.value }))}
                      className={ic + ' font-mono'} />
                  </div>
                ))}
              </div>
            </div>
          ))
        })()}

        {pcSaved && <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">Plan comptable sauvegarde</div>}

        <motion.button onClick={async () => {
          setSaving(true)
          await supabase.auth.updateUser({ data: { ...meta, plan_comptable: planComptable } })
          setSaving(false); setPcSaved(true); setTimeout(() => setPcSaved(false), 3000)
        }} disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 bg-[#1E40AF] hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-colors disabled:opacity-60 cursor-pointer">
          {saving ? 'Sauvegarde...' : 'Sauvegarder le plan comptable'}
        </motion.button>
      </motion.div>

      {/* Expert-comptable */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900">Acces expert-comptable</h2>
        <p className="text-xs text-gray-500">Invitez votre expert-comptable pour qu'il puisse consulter et modifier le plan comptable et telecharger les exports FEC.</p>
        <div><label className={lb}>Email expert-comptable</label>
          <div className="flex gap-2">
            <input type="email" value={emailExpert} onChange={(e) => setEmailExpert(e.target.value)} placeholder="expert@cabinet.fr" className={ic + ' flex-1'} />
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              disabled={inviting || !emailExpert.includes('@')}
              onClick={async () => {
                setInviting(true); setInvited(false)
                await supabase.auth.updateUser({ data: { ...meta, email_expert: emailExpert } })
                await supabase.functions.invoke('send-email', {
                  body: { type: 'welcome', to: emailExpert, data: { name: 'Expert-comptable' } },
                })
                setInviting(false); setInvited(true); setTimeout(() => setInvited(false), 4000)
              }}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-[#1E40AF] hover:bg-blue-700 rounded-xl transition-colors cursor-pointer disabled:opacity-40 flex-shrink-0">
              {inviting ? 'Envoi...' : 'Inviter'}
            </motion.button>
          </div>
          {invited && <p className="text-[11px] text-[#1E40AF] font-semibold mt-1">Invitation envoyee a {emailExpert}</p>}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Zone dangereuse</h2>
        <button onClick={handleLogout} className="px-5 py-2.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-xl transition-all cursor-pointer">
          Se déconnecter
        </button>
      </motion.div>
    </div>
  )
}
