import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { backendClient } from '@/lib/backendClient';
import { downloadCsvFile, downloadHtmlFile, printHtmlDocument } from '@/lib/downloads';

type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';
type InvoiceType = 'formation' | 'prestation' | 'projet' | 'abonnement';

interface Invoice {
  id: string;
  user_id?: string;
  number: string;
  type: InvoiceType;
  description: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string | null;
  recipient: {
    name: string;
    email: string;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export default function FacturesPage() {
  const { user } = useAuth();
  const { success } = useToast();
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<InvoiceType | 'all'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const loadInvoices = async () => {
      if (!user?.id) {
        setInvoices([]);
        return;
      }

      try {
        const { data, error } = await backendClient
          .from<Invoice>('invoices')
          .select('*')
          .eq('user_id', user.id)
          .order('issueDate', { ascending: false });
        if (error) {
          throw error;
        }
        setInvoices((data || []) as Invoice[]);
      } catch (error) {
        console.error(error);
        setInvoices([]);
      }
    };

    loadInvoices();
  }, [user?.id]);

  const getStatusColor = (status: InvoiceStatus): string => {
    const colors: Record<InvoiceStatus, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status];
  };

  const getStatusLabel = (status: InvoiceStatus): string => {
    const labels: Record<InvoiceStatus, string> = {
      paid: 'Payée',
      pending: 'En attente',
      overdue: 'En retard',
      cancelled: 'Annulée'
    };
    return labels[status];
  };

  const getTypeLabel = (type: InvoiceType): string => {
    const labels: Record<InvoiceType, string> = {
      formation: 'Formation',
      prestation: 'Prestation',
      projet: 'Projet',
      abonnement: 'Abonnement'
    };
    return labels[type];
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    if (filterType !== 'all' && inv.type !== filterType) return false;
    return true;
  });

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric'
    });
  };

  const formatAmount = (amount: number, currency: string): string => {
    return `${amount.toLocaleString('fr-FR')} ${currency}`;
  };

  const buildInvoiceHtml = (invoice: Invoice) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${invoice.number}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f1e8; color: #111; margin: 0; padding: 40px; }
    main { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 24px; border: 1px solid #e7dfd0; padding: 40px; }
    .eyebrow { color: #9a7a2f; letter-spacing: 0.3em; text-transform: uppercase; font-size: 12px; font-weight: 700; }
    h1 { margin: 16px 0 24px; font-size: 36px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 28px; }
    .card { background: #faf7ef; border-radius: 18px; padding: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 12px 0; border-bottom: 1px solid #ece7da; font-size: 14px; }
    th { color: #6b6b6b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
    .total { margin-top: 28px; text-align: right; font-size: 22px; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Centre C2P</p>
    <h1>Facture ${invoice.number}</h1>
    <div class="grid">
      <div class="card"><strong>Destinataire</strong><br />${invoice.recipient.name}<br />${invoice.recipient.email}</div>
      <div class="card"><strong>Meta</strong><br />Type : ${getTypeLabel(invoice.type)}<br />Emission : ${formatDate(invoice.issueDate)}<br />Echeance : ${formatDate(invoice.dueDate)}</div>
    </div>
    <p>${invoice.description}</p>
    <table>
      <thead>
        <tr><th>Ligne</th><th>Quantite</th><th>Prix unitaire</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${invoice.items.map((item) => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${formatAmount(item.unitPrice, invoice.currency)}</td><td>${formatAmount(item.total, invoice.currency)}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="total">Total : ${formatAmount(invoice.amount, invoice.currency)}</div>
  </main>
</body>
</html>`;

  const downloadInvoice = (invoice: Invoice) => {
    downloadHtmlFile(`${invoice.number}.html`, buildInvoiceHtml(invoice));
    success('Telechargement', `La facture ${invoice.number} a ete telechargee.`);
  };

  const printInvoice = (invoice: Invoice) => {
    printHtmlDocument(invoice.number, buildInvoiceHtml(invoice));
    success('Impression', `La facture ${invoice.number} a ete ouverte pour impression.`);
  };

  const exportAll = () => {
    downloadCsvFile('factures.csv', filteredInvoices.map((invoice) => ({
      numero: invoice.number,
      description: invoice.description,
      type: getTypeLabel(invoice.type),
      montant: invoice.amount,
      devise: invoice.currency,
      statut: getStatusLabel(invoice.status),
      emission: invoice.issueDate,
      echeance: invoice.dueDate,
      destinataire: invoice.recipient.name,
      email: invoice.recipient.email,
    })));
    success('Export', `${filteredInvoices.length} facture(s) exportee(s) au format CSV.`);
  };

  return (
    <DashboardLayout>
      <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Factures' }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Factures</h1>
        <p className="text-gray-600">Consultez et gérez vos factures</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 flex items-center justify-center"><i className="ri-check-line text-lg text-green-600"></i></div>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{invoices.filter(i => i.status === 'paid').length}</p>
          <p className="text-sm text-gray-600">Factures payées</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 flex items-center justify-center"><i className="ri-time-line text-lg text-yellow-600"></i></div>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{invoices.filter(i => i.status === 'pending').length}</p>
          <p className="text-sm text-gray-600">En attente</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 flex items-center justify-center"><i className="ri-alert-line text-lg text-red-600"></i></div>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{invoices.filter(i => i.status === 'overdue').length}</p>
          <p className="text-sm text-gray-600">En retard</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 flex items-center justify-center"><i className="ri-money-dollar-circle-line text-lg text-teal-600"></i></div>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{formatAmount(invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0), 'XAF')}</p>
          <p className="text-sm text-gray-600">Total payé</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | 'all')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none">
              <option value="all">Tous les statuts</option>
              <option value="paid">Payées</option>
              <option value="pending">En attente</option>
              <option value="overdue">En retard</option>
              <option value="cancelled">Annulées</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as InvoiceType | 'all')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none">
              <option value="all">Tous les types</option>
              <option value="formation">Formations</option>
              <option value="prestation">Prestations</option>
              <option value="projet">Projets</option>
              <option value="abonnement">Abonnements</option>
            </select>
          </div>
          <div className="ml-auto flex items-end">
            <button onClick={exportAll} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer">
              <div className="w-4 h-4 inline-flex items-center justify-center mr-2"><i className="ri-download-line text-base"></i></div>
              Exporter tout
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numéro</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Échéance</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{invoice.number}</p>
                    <p className="text-xs text-gray-500">{formatDate(invoice.issueDate)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{invoice.description}</p>
                    <p className="text-xs text-gray-500">{invoice.recipient.name}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-gray-600">{getTypeLabel(invoice.type)}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap"><p className="text-sm font-medium text-gray-900">{formatAmount(invoice.amount, invoice.currency)}</p></td>
                  <td className="px-6 py-4 whitespace-nowrap"><p className="text-sm text-gray-600">{formatDate(invoice.dueDate)}</p></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>{getStatusLabel(invoice.status)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => setSelectedInvoice(invoice)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Voir détails">
                        <div className="w-4 h-4 flex items-center justify-center"><i className="ri-eye-line text-base"></i></div>
                      </button>
                      <button onClick={() => downloadInvoice(invoice)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Télécharger">
                        <div className="w-4 h-4 flex items-center justify-center"><i className="ri-download-line text-base"></i></div>
                      </button>
                      <button onClick={() => printInvoice(invoice)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Imprimer">
                        <div className="w-4 h-4 flex items-center justify-center"><i className="ri-printer-line text-base"></i></div>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 flex items-center justify-center"><i className="ri-file-list-line text-3xl text-gray-400"></i></div>
            </div>
            <p className="text-gray-600">Aucune facture trouvée</p>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Détails de la facture</h2>
              <button onClick={() => setSelectedInvoice(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <div className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line text-xl"></i></div>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f766e]">
                    <span className="text-white font-bold text-lg">C2P</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Centre C2P</p>
                    <p className="text-sm text-gray-600">Yaoundé, Cameroun</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 mb-1">{selectedInvoice.number}</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedInvoice.status)}`}>{getStatusLabel(selectedInvoice.status)}</span>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500 mb-2">Facturé à</p>
                <p className="font-medium text-gray-900">{selectedInvoice.recipient.name}</p>
                <p className="text-sm text-gray-600">{selectedInvoice.recipient.email}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Date d&apos;émission</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedInvoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Date d&apos;échéance</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedInvoice.dueDate)}</p>
                </div>
                {selectedInvoice.paidDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Date de paiement</p>
                    <p className="text-sm text-gray-900">{formatDate(selectedInvoice.paidDate)}</p>
                  </div>
                )}
              </div>
              <div className="mb-6">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qté</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatAmount(item.unitPrice, selectedInvoice.currency)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatAmount(item.total, selectedInvoice.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-medium text-gray-900">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatAmount(selectedInvoice.amount, selectedInvoice.currency)}</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button onClick={() => downloadInvoice(selectedInvoice)} className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap">
                  <div className="w-4 h-4 inline-flex items-center justify-center mr-2"><i className="ri-download-line text-base"></i></div>
                  Télécharger PDF
                </button>
                <button onClick={() => printInvoice(selectedInvoice)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
                  <div className="w-4 h-4 inline-flex items-center justify-center mr-2"><i className="ri-printer-line text-base"></i></div>
                  Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
