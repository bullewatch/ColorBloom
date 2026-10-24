import React from 'react';
import { X, ShieldAlert, CheckCircle, FileText, Ban, Sparkles } from 'lucide-react';

export function CguModal({ isOpen, onClose, onAccept }) {
  if (!isOpen) return null;

  return (
    <div className="modal cb-cgu-modal-backdrop" onClick={onClose}>
      <div className="cb-cgu-modal-box" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Fermer"><X /></button>

        <div className="cb-cgu-header">
          <FileText className="cb-cgu-icon" size={32} />
          <h2>Conditions Générales d'Utilisation & de Vente (CGU / CGV)</h2>
          <p className="cb-cgu-site-tag">Colorblop • Règles officielles de licence des dessins et fichiers numériques</p>
        </div>

        <div className="cb-cgu-body">
          <section className="cb-cgu-section">
            <h3><Sparkles size={18} /> 1. Nature des fichiers et destination</h3>
            <p>
              Tous les dessins, coloriages, fichiers vectoriels SVG, images PNG et documents PDF mis à disposition sur le site <b>Colorblop</b> sont des créations artistiques protégées par le droit d'auteur et la propriété intellectuelle.
            </p>
            <p>
              Les fichiers sont principalement destinés à un <b>usage personnel, familial, créatif et récréatif</b>.
            </p>
          </section>

          <section className="cb-cgu-section highlight-allowed">
            <h3><CheckCircle size={18} color="#27ae60" /> 2. Utilisations créatives dérivées AUTORISÉES</h3>
            <p>
              Vous êtes expressément autorisé(e) à transformer et intégrer les dessins dans des <b>créations dérivées et supports physiques personnalisés</b>, notamment :
            </p>
            <ul>
              <li>Sublimation et impression sur textile ou objets : tote bags, sacs, t-shirts, mugs, coussins, trousses, etc.</li>
              <li>Découpe et gravure personnelle via machines de découpe (traceurs Cricut, Silhouette, laser, etc.).</li>
              <li>Créations manuelles, scrapbooking, coloriages plastifiés ou activités manuelles pour enfants et ateliers.</li>
            </ul>
          </section>

          <section className="cb-cgu-section highlight-forbidden">
            <h3><Ban size={18} color="#c0392b" /> 3. Interdictions formelles et strictes</h3>
            <p>
              Afin de protéger le travail de l'artiste et la gratuité de la communauté, les pratiques suivantes sont <b>strictement interdites</b> :
            </p>
            <ul>
              <li>
                <b>INTERDICTION DE REVENTE TEL QUEL :</b> Il est formellement interdit de revendre, céder, redistribuer ou partager les fichiers numériques bruts (SVG, PNG, PDF) tels qu'ils sont téléchargés sur Colorblop, que ce soit à titre onéreux ou gratuit, sur des plateformes comme Etsy, Amazon, banques d'images ou réseaux sociaux.
              </li>
              <li>
                <b>INTERDICTION DE CRÉATION DE CAHIERS DE COLORIAGE :</b> Il est strictement interdit d'utiliser les dessins réutilisés tels quels pour créer, éditer, imprimer et commercialiser des cahiers de coloriage, livres d'activités, ebooks ou recueils d'illustrations.
              </li>
              <li>
                <b>JAMAIS LE PRODUIT TEL QUE RÉCUPÉRÉ :</b> Le fichier ou le dessin ne peut en aucun cas être vendu ou monétisé sous sa forme originale brute.
              </li>
            </ul>
          </section>

          <section className="cb-cgu-section">
            <h3><ShieldAlert size={18} /> 4. Respect des conditions & Sanctions</h3>
            <p>
              Tout manquement à ces règles constitue une contrefaçon et une violation des droits d'auteur, entraînant la clôture immédiate du compte et d'éventuelles poursuites conformément au Code de la propriété intellectuelle.
            </p>
          </section>
        </div>

        <div className="cb-cgu-footer">
          <button
            type="button"
            className="cb-cgu-accept-btn"
            onClick={() => {
              if (onAccept) onAccept();
              onClose();
            }}
          >
            <CheckCircle size={18} /> J'ai lu, je comprends et j'accepte les CGU / CGV
          </button>
        </div>
      </div>
    </div>
  );
}
