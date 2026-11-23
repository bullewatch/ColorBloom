import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle,
  FileText,
  Ban,
  Sparkles,
  Building2,
  ShieldCheck,
  Mail,
  CreditCard,
  Scale,
  Cookie,
  UserCheck
} from 'lucide-react';

export function LegalModal({
  isOpen,
  onClose,
  onAccept,
  initialTab = 'cgu',
  lang = 'FR'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="modal cb-cgu-modal-backdrop" onClick={onClose}>
      <div className="cb-cgu-modal-box cb-legal-modal-box" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="cb-cgu-header">
          <FileText className="cb-cgu-icon" size={32} />
          <h2>
            {activeTab === 'cgu' && "Conditions Générales d'Utilisation & de Vente"}
            {activeTab === 'mentions' && "Mentions Légales"}
            {activeTab === 'privacy' && "Politique de Confidentialité & RGPD"}
          </h2>
          <p className="cb-cgu-site-tag">Colorblop • Coloriages créatifs et licences officielles</p>

          {/* Navigation Tabs */}
          <div className="cb-legal-tabs-nav" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'cgu'}
              className={`cb-legal-tab-btn ${activeTab === 'cgu' ? 'active' : ''}`}
              onClick={() => setActiveTab('cgu')}
            >
              <FileText size={15} />
              <span>CGU / CGV</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'mentions'}
              className={`cb-legal-tab-btn ${activeTab === 'mentions' ? 'active' : ''}`}
              onClick={() => setActiveTab('mentions')}
            >
              <Building2 size={15} />
              <span>Mentions Légales</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'privacy'}
              className={`cb-legal-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              <ShieldCheck size={15} />
              <span>Confidentialité & RGPD</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="cb-cgu-body">
          {/* TAB 1: CGU & CGV */}
          {activeTab === 'cgu' && (
            <>
              <section className="cb-cgu-section">
                <h3><Sparkles size={18} /> 1. Objet et destination des fichiers</h3>
                <p>
                  Tous les dessins, coloriages, fichiers vectoriels SVG, images PNG et documents PDF mis à disposition sur <b>Colorblop</b> sont des créations artistiques originales protégées par le droit d'auteur et le Code de la propriété intellectuelle.
                </p>
                <p>
                  Le site propose des coloriages accessibles gratuitement pour les visiteurs (avec une limite de découverte de 3 coloriages pour les visiteurs non inscrits) et pour les utilisateurs titulaires d’un compte gratuit.
                </p>
              </section>

              <section className="cb-cgu-section highlight-allowed">
                <h3><CheckCircle size={18} color="#27ae60" /> 2. Utilisations créatives dérivées AUTORISÉES</h3>
                <p>
                  Vous êtes expressément autorisé(e) à transformer et intégrer les dessins dans des <b>créations dérivées et supports physiques personnalisés</b>, notamment :
                </p>
                <ul>
                  <li>Sublimation et impression sur textile ou objets réels : tote bags, t-shirts, mugs, coussins, trousses, étiquettes, etc.</li>
                  <li>Découpe, traçage et gravure personnelle via machines de découpe (traceurs Cricut, Silhouette, découpeuse laser, etc.).</li>
                  <li>Créations manuelles, scrapbooking, coloriages plastifiés ou activités créatives pour enfants, écoles et ateliers récréatifs.</li>
                </ul>
              </section>

              <section className="cb-cgu-section highlight-forbidden">
                <h3><Ban size={18} color="#c0392b" /> 3. Interdictions formelles et strictes</h3>
                <p>
                  Afin de préserver le travail de l'artiste et la gratuité communautaire, les pratiques suivantes sont <b>strictement interdites</b> :
                </p>
                <ul>
                  <li>
                    <b>INTERDICTION DE REVENTE DU FICHIER TEL QUEL :</b> Il est formellement interdit de revendre, céder, redistribuer ou partager les fichiers numériques bruts (SVG, PNG, PDF) tels qu'ils sont téléchargés sur Colorblop, que ce soit à titre onéreux ou gratuit, sur des plateformes comme Etsy, Creative Fabrica, Amazon, banques d'images ou réseaux sociaux.
                  </li>
                  <li>
                    <b>INTERDICTION DE CRÉATION DE LIVRES & CAHIERS DE COLORIAGE :</b> Il est strictement interdit d'utiliser les dessins pour créer, éditer, imprimer et commercialiser des cahiers de coloriage, livres d'activités, ebooks ou recueils d'illustrations.
                  </li>
                  <li>
                    <b>JAMAIS LE PRODUIT BRUT TEL QUE RÉCUPÉRÉ :</b> Le fichier ou le dessin ne peut en aucun cas être vendu ou monétisé sous sa forme originale brute sans transformation substantielle en produit physique.
                  </li>
                </ul>
              </section>

              <section className="cb-cgu-section">
                <h3><CreditCard size={18} color="#844c20" /> 4. Formules d'abonnement & Conditions Générales de Vente (CGV)</h3>
                <p>
                  Colorblop propose deux formules d'abonnement optionnelles payantes donnant accès aux fichiers vectoriels SVG bruts :
                </p>
                <ul>
                  <li>
                    <b>ColorVIP (2,99 € TTC/mois ou 24,99 € TTC/an) :</b> Téléchargements illimités des fichiers vectoriels SVG pour un <b>usage strictement personnel</b>.
                  </li>
                  <li>
                    <b>ColorVIP Pro (5,99 € TTC/mois ou 49,99 € TTC/an) :</b> Téléchargements illimités des fichiers vectoriels SVG avec <b>Licence commerciale incluse</b> autorisant la vente de produits physiques dérivés personnalisés. Une attestation officielle nominative avec numéro de série unique vous est délivrée en PDF.
                  </li>
                </ul>
                <p>
                  Les paiements sont réalisés en Euros (€ TTC) de manière sécurisée via notre prestataire Stripe. Les abonnements sont renouvelés automatiquement par tacite reconduction à chaque échéance mensuelle ou annuelle.
                </p>
                <p>
                  <b>Résiliation en 1 clic :</b> Vous pouvez interrompre le renouvellement de votre abonnement à tout moment, sans frais ni préavis, directement depuis votre espace personnel ou via le portail Stripe. L'accès reste garanti jusqu'à la fin de la période déjà réglée.
                </p>
              </section>

              <section className="cb-cgu-section highlight-notice">
                <h3><Scale size={18} color="#b2711e" /> 5. Renonciation expresse au droit de rétractation</h3>
                <p>
                  Conformément aux dispositions de l’<b>article L. 221-28 13° du Code de la consommation français</b>, le droit légal de rétractation de 14 jours ne peut être exercé pour les contrats de fourniture d'un contenu numérique non fourni sur un support matériel dont l'exécution a commencé après accord préalable exprès du consommateur et renoncement exprès à son droit de rétractation.
                </p>
                <p>
                  En validant votre souscription à un abonnement ColorVIP ou ColorVIP Pro, vous demandez expressément l'accès immédiat aux téléchargements vectoriels et reconnaissez renoncer expressément à votre droit de rétractation.
                </p>
              </section>

              <section className="cb-cgu-section">
                <h3><ShieldAlert size={18} /> 6. Respect des conditions, Droit applicable et Médiation</h3>
                <p>
                  Tout manquement à ces règles constitue une contrefaçon et une violation des droits d'auteur, entraînant la clôture immédiate du compte et d'éventuelles poursuites judiciaires conformément au Code de la propriété intellectuelle.
                </p>
                <p>
                  Les présentes conditions sont soumises au droit français. En cas de litige non résolu à l'amiable avec notre service, le consommateur peut faire appel gratuitement au médiateur de la consommation compétent en application du Code de la consommation.
                </p>
              </section>
            </>
          )}

          {/* TAB 2: MENTIONS LÉGALES */}
          {activeTab === 'mentions' && (
            <>
              <section className="cb-cgu-section">
                <h3><Building2 size={18} color="#844c20" /> 1. Éditeur du site internet</h3>
                <p>
                  Le site internet <b>Colorblop</b> (accessible à l'adresse <code>https://colorblop.com</code>) est un service en ligne artistique et récréatif édité par :
                </p>
                <ul>
                  <li><b>Nom du service :</b> Colorblop</li>
                  <li><b>Activité :</b> Création artistique, coloriages numériques et fichiers vectoriels</li>
                  <li><b>Directeur de la publication :</b> L'équipe fondatrice Colorblop</li>
                  <li><b>Contact e-mail :</b> <a href="mailto:contact@colorblop.com" className="cb-legal-link">contact@colorblop.com</a> / <a href="mailto:flo83119@gmail.com" className="cb-legal-link">flo83119@gmail.com</a></li>
                  <li><b>Formulaire de contact :</b> Boîte à lettres interactive accessible directement sur le site</li>
                </ul>
              </section>

              <section className="cb-cgu-section">
                <h3><Building2 size={18} color="#2e7d32" /> 2. Hébergement du site</h3>
                <p>
                  Le site et son infrastructure web globale sont hébergés auprès de :
                </p>
                <ul>
                  <li><b>Hébergeur principal :</b> Cloudflare, Inc.</li>
                  <li><b>Adresse :</b> 101 Townsend St, San Francisco, CA 94107, États-Unis</li>
                  <li><b>Téléphone :</b> +1 (888) 993-5273</li>
                  <li><b>Site internet :</b> <a href="https://www.cloudflare.com" target="_blank" rel="noopener noreferrer" className="cb-legal-link">https://www.cloudflare.com</a></li>
                </ul>
              </section>

              <section className="cb-cgu-section">
                <h3><Building2 size={18} color="#1565c0" /> 3. Base de données & Infrastructure applicative</h3>
                <p>
                  L’authentification des utilisateurs, la gestion des profils et le stockage cloud sécurisé sont opérés par :
                </p>
                <ul>
                  <li><b>Prestataire :</b> Supabase Inc.</li>
                  <li><b>Adresse :</b> 970 Toa Payoh North #07-04, Singapour 318992</li>
                  <li><b>Site internet :</b> <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="cb-legal-link">https://supabase.com</a></li>
                </ul>
              </section>

              <section className="cb-cgu-section">
                <h3><CreditCard size={18} color="#6772e5" /> 4. Traitement sécurisé des paiements</h3>
                <p>
                  La gestion des transactions financières et des abonnements est confiée à :
                </p>
                <ul>
                  <li><b>Prestataire de paiement :</b> Stripe Payments Europe, Ltd.</li>
                  <li><b>Adresse :</b> 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, D02 H210, Irlande</li>
                  <li><b>Conformité :</b> Certifié PCI-DSS niveau 1, chiffrement bancaire haute sécurité</li>
                </ul>
              </section>

              <section className="cb-cgu-section">
                <h3><Sparkles size={18} /> 5. Propriété intellectuelle</h3>
                <p>
                  Tous les éléments du site Colorblop (illustrations originales, logos, chartes graphiques, mascottes, textes, code source) sont protégés au titre des droits d'auteur, brevets et marques. Toute reproduction, diffusion ou réutilisation non expressément autorisée dans le cadre des CGU constitue une contrefaçon sanctionnée par les articles L. 335-2 et suivants du Code de la propriété intellectuelle.
                </p>
              </section>
            </>
          )}

          {/* TAB 3: CONFIDENTIALITÉ & RGPD */}
          {activeTab === 'privacy' && (
            <>
              <section className="cb-cgu-section">
                <h3><ShieldCheck size={18} color="#27ae60" /> 1. Engagement de protection des données</h3>
                <p>
                  Colorblop accorde une importance primordiale au respect de votre vie privée et à la sécurité de vos données personnelles, conformément au <b>Règlement Général sur la Protection des Données (RGPD n° 2016/679)</b> et à la loi française « Informatique et Libertés ».
                </p>
              </section>

              <section className="cb-cgu-section">
                <h3><UserCheck size={18} color="#844c20" /> 2. Données personnelles collectées</h3>
                <p>
                  Colorblop applique le principe de minimisation : nous ne collectons que les informations strictement nécessaires :
                </p>
                <ul>
                  <li><b>Adresse e-mail :</b> requise pour la création du compte, la sécurisation des accès, la réinitialisation de mot de passe et l’envoi des reçus d’abonnement.</li>
                  <li><b>Pseudonyme :</b> pseudo public librement choisi par l’utilisateur.</li>
                  <li><b>Préférences d'utilisation :</b> vos dessins favoris enregistrés et votre langue préférée (FR, EN, ES, DE).</li>
                  <li><b>Nom du titulaire (Abonnés Pro uniquement) :</b> nom ou raison sociale verrouillé pour figurer sur l’attestation officielle de licence commerciale.</li>
                </ul>
              </section>

              <section className="cb-cgu-section highlight-allowed">
                <h3><CreditCard size={18} color="#1e7e34" /> 3. Sécurité bancaire totale (Aucun stockage de carte)</h3>
                <p>
                  Colorblop <b>ne collecte, ne stocke et ne traite JAMAIS vos coordonnées bancaires</b> (numéros de carte, cryptogrammes). Vos données de paiement sont directement transmises à Stripe selon le protocole de chiffrement bancaire sécurisé TLS 1.3 / AES-256.
                </p>
              </section>

              <section className="cb-cgu-section highlight-allowed">
                <h3><Cookie size={18} color="#844c20" /> 4. Cookies & Traceurs : Zéro pistage publicitaire</h3>
                <p>
                  Colorblop n'utilise <b>aucun cookie publicitaire</b>, aucun tracker de réseaux sociaux ni aucun outil d'analyse intrusif.
                </p>
                <p>
                  Seules des clés techniques locales de session (stockage sécurisé <code>localStorage</code>) sont utilisées pour vous maintenir connecté(e) et sauvegarder vos choix (coloriages favoris, langue sélectionnée). Conformément aux recommandations de la CNIL, ce fonctionnement technique essentiel est exempté de consentement préalable.
                </p>
              </section>

              <section className="cb-cgu-section">
                <h3><Scale size={18} color="#1565c0" /> 5. Vos droits (Accès, Rectification, Droit à l'oubli)</h3>
                <p>
                  Conformément au RGPD, vous disposez des droits suivants sur vos données :
                </p>
                <ul>
                  <li><b>Droit d'accès et de rectification :</b> vous pouvez modifier vos informations de profil directement sur le site.</li>
                  <li><b>Droit à l'effacement (Suppression de compte) :</b> vous pouvez demander la suppression intégrale et définitive de votre compte et de toutes vos données associées à tout moment sur simple demande par e-mail ou via la boîte à courrier du site.</li>
                  <li><b>Contact DPO / Données :</b> <a href="mailto:contact@colorblop.com" className="cb-legal-link">contact@colorblop.com</a>.</li>
                </ul>
              </section>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="cb-cgu-footer">
          {onAccept ? (
            <button
              type="button"
              className="cb-cgu-accept-btn"
              onClick={() => {
                onAccept();
                onClose();
              }}
            >
              <CheckCircle size={18} /> J'ai lu, je comprends et j'accepte les CGU / CGV
            </button>
          ) : (
            <button
              type="button"
              className="cb-cgu-accept-btn"
              onClick={onClose}
            >
              <CheckCircle size={18} /> Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Re-export CguModal for complete backward compatibility
export const CguModal = LegalModal;
export default LegalModal;
