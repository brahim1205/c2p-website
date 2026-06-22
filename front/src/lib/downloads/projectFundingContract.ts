import type { ProjectFundingCommitment } from '@/lib/projectApi';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { openHtmlPreview } from '@/lib/downloads';

const fundingLabels = {
  donation: 'Don',
  profit_share_loan: 'Prêt sans intérêt avec partage de bénéfices',
  interest_loan: 'Prêt avec intérêt sans partage de bénéfices',
};

export function openProjectFundingContract(commitment: ProjectFundingCommitment) {
  const rows = (commitment.schedule ?? []).map((entry) => `
    <tr><td>${entry.period}</td><td>${formatCurrency(entry.principal)}</td><td>${formatCurrency(entry.profit)}</td><td>${formatCurrency(entry.interest)}</td><td>${formatCurrency(entry.payment)}</td><td>${entry.status === 'paid' ? 'Payée' : 'À venir'}</td></tr>
  `).join('');
  openHtmlPreview(`contrat-financement-${commitment.id}`, `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Convention de financement C2P</title><style>
  body{font-family:Arial,sans-serif;background:#f3f4f6;color:#172033;padding:32px}main{max-width:980px;margin:auto;background:white;padding:42px;border:1px solid #d1d5db}h1{text-align:center;color:#164f48}h2{margin-top:28px;color:#27346b}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{padding:14px;background:#f8fafc;border:1px solid #e5e7eb}table{width:100%;border-collapse:collapse;margin-top:15px}th,td{border:1px solid #d1d5db;padding:8px;text-align:right}th:first-child,td:first-child{text-align:center}.warning{background:#fff7ed;border:1px solid #fed7aa;padding:14px;margin-top:20px}.signatures{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:60px}.signature{border-top:1px solid #111;padding-top:8px;text-align:center}</style></head><body><main>
  <h1>Convention de financement participatif C2P</h1><p style="text-align:center">Référence : ${String(commitment.id)}</p>
  <div class="meta"><div class="box"><strong>Projet</strong><br>${commitment.project_title}</div><div class="box"><strong>Partenaire</strong><br>${commitment.partner_name ?? commitment.partner_id}</div><div class="box"><strong>Type</strong><br>${fundingLabels[commitment.funding_type]}</div><div class="box"><strong>Badge</strong><br>${commitment.partner_badge}</div><div class="box"><strong>Montant</strong><br>${formatCurrency(commitment.amount)}</div><div class="box"><strong>Durée</strong><br>${commitment.duration_months} mois</div></div>
  <h2>Échéancier indicatif</h2><table><thead><tr><th>Mois</th><th>Capital</th><th>Bénéfice</th><th>Intérêt</th><th>Total</th><th>État</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="warning"><strong>Clauses essentielles.</strong> Cette convention ne devient active qu’après validation C2P, vérification des parties et confirmation du transfert. Les projections ne constituent pas une garantie de rendement. ${commitment.guarantee}</div>
  <p>Créée le ${formatDate(commitment.created_at)}. Statut : ${commitment.status.replaceAll('_', ' ')}.</p>
  <div class="signatures"><div class="signature">Partenaire financier</div><div class="signature">Porteur du projet</div><div class="signature">Validation C2P</div></div>
  </main></body></html>`);
}
