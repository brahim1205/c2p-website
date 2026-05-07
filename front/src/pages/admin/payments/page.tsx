import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { createAdminTransaction, fetchAdminTransactions, updateAdminTransaction, type AdminPaymentTransaction } from '@/lib/adminApi';
import { fetchUsers } from '@/lib/accountApi';
import { downloadCsvFile } from '@/lib/downloads';

type TransactionRow = AdminPaymentTransaction & { user: string; email: string; fee: number; net: number };

export default function AdminPaymentsPage() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      const [items, users] = await Promise.all([fetchAdminTransactions(), fetchUsers()]);
      const usersById = new Map(users.map((user) => [user.id, user]));
      setTransactions(items.map((item) => {
        const linkedUser = usersById.get(item.user_id);
        const fee = Math.round(Number(item.amount || 0) * 0.03);
        return {
          ...item,
          user: linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : item.user_id,
          email: linkedUser?.email || '-',
          fee,
          net: Math.max(0, Number(item.amount || 0) - fee),
        };
      }));
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les paiements.');
    }
  }, [error]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = useMemo(
    () => (activeTab === 'all' ? transactions : transactions.filter((transaction) => transaction.status === activeTab)),
    [activeTab, transactions],
  );

  const stats = useMemo(() => [
    { label: 'Revenus totaux', value: `${transactions.filter((item) => item.status === 'completed').reduce((sum, item) => sum + item.amount, 0).toLocaleString('fr-FR')} FCFA`, icon: 'ri-money-dollar-circle-line', color: 'bg-green-500' },
    { label: 'Transactions reussies', value: String(transactions.filter((item) => item.status === 'completed').length), icon: 'ri-check-line', color: 'bg-[#14B8A6]' },
    { label: 'En attente', value: String(transactions.filter((item) => item.status === 'pending').length), icon: 'ri-time-line', color: 'bg-orange-500' },
    { label: 'Echouees', value: String(transactions.filter((item) => item.status === 'failed').length), icon: 'ri-close-line', color: 'bg-red-500' },
  ], [transactions]);

  const getStatusBadge = (status: TransactionRow['status']) => {
    const styles = { completed: 'bg-green-100 text-green-700', pending: 'bg-orange-100 text-orange-700', failed: 'bg-red-100 text-red-700' };
    const labels = { completed: 'Complete', pending: 'En attente', failed: 'Echoue' };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const handleChangeStatus = async (transaction: TransactionRow, status: TransactionRow['status']) => {
    try {
      const updated = await updateAdminTransaction(transaction.id, { status });
      setTransactions((prev) => prev.map((item) => item.id === transaction.id ? { ...item, ...updated } : item));
      success('Statut mis a jour', transaction.id);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Mise a jour impossible.');
    }
  };

  const handleRefund = async () => {
    if (!selectedTransaction) return;
    try {
      const refundId = `RF-${Date.now()}`;
      await createAdminTransaction({
        id: refundId,
        user_id: selectedTransaction.user_id,
        type: 'refund',
        amount: selectedTransaction.amount,
        currency: selectedTransaction.currency,
        method: selectedTransaction.method,
        status: 'completed',
        description: `Remboursement de ${selectedTransaction.id}`,
        date: new Date().toISOString(),
        reference: refundId,
      });
      setShowRefundModal(false);
      success('Remboursement initie', selectedTransaction.user);
      loadTransactions();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Remboursement impossible.');
    }
  };

  const handleExport = () => {
    downloadCsvFile('admin-paiements.csv', filteredTransactions.map((transaction) => ({
      id: transaction.id,
      utilisateur: transaction.user,
      email: transaction.email,
      type: transaction.type,
      montant: transaction.amount,
      devise: transaction.currency,
      methode: transaction.method,
      statut: transaction.status,
      frais: transaction.fee,
      net: transaction.net,
      date: transaction.date,
      reference: transaction.reference ?? '',
    })));
    success('Rapport exporte', 'Le rapport financier a ete telecharge.');
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Paiements' }]} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestion des paiements</h1>
          <button onClick={handleExport} className="px-6 py-3 bg-[#14B8A6] text-white rounded-lg hover:bg-[#0D9488] transition-colors font-medium whitespace-nowrap">
            Exporter le rapport
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center mb-4`}>
                <i className={`${stat.icon} text-xl text-white`}></i>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6 overflow-x-auto">
              {(['all', 'completed', 'pending', 'failed'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab ? 'border-[#14B8A6] text-[#14B8A6]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab === 'all' && `Toutes (${transactions.length})`}
                  {tab === 'completed' && `Completees (${transactions.filter((item) => item.status === 'completed').length})`}
                  {tab === 'pending' && `En attente (${transactions.filter((item) => item.status === 'pending').length})`}
                  {tab === 'failed' && `Echouees (${transactions.filter((item) => item.status === 'failed').length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Methode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{transaction.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{transaction.user}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{transaction.type}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{transaction.amount.toLocaleString('fr-FR')} FCFA</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{transaction.method}</td>
                    <td className="px-6 py-4">{getStatusBadge(transaction.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(transaction.date).toLocaleString('fr-FR')}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setSelectedTransaction(transaction); setShowDetailModal(true); }} className="px-3 py-1.5 text-[#14B8A6] hover:text-[#0D9488] text-sm font-medium whitespace-nowrap hover:bg-[#14B8A6]/10 rounded-lg transition-colors">Details</button>
                        {transaction.status !== 'completed' && <button onClick={() => void handleChangeStatus(transaction, 'completed')} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-green-50 transition-colors" title="Valider"><i className="ri-check-line text-green-500 text-sm"></i></button>}
                        {transaction.status === 'failed' && <button onClick={() => void handleChangeStatus(transaction, 'pending')} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-50 transition-colors" title="Relancer"><i className="ri-restart-line text-orange-500 text-sm"></i></button>}
                        {transaction.status === 'completed' && <button onClick={() => { setSelectedTransaction(transaction); setShowRefundModal(true); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors" title="Rembourser"><i className="ri-refund-line text-red-500 text-sm"></i></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showDetailModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Detail transaction</h3>
                <button onClick={() => setShowDetailModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"><i className="ri-close-line text-gray-500 text-xl"></i></button>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">ID</span><span className="font-medium text-gray-900">{selectedTransaction.id}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Utilisateur</span><span className="font-medium text-gray-900">{selectedTransaction.user}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Email</span><span className="font-medium text-gray-900">{selectedTransaction.email}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Montant</span><span className="font-medium text-gray-900">{selectedTransaction.amount.toLocaleString('fr-FR')} FCFA</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Frais</span><span className="font-medium text-gray-900">{selectedTransaction.fee.toLocaleString('fr-FR')} FCFA</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Net</span><span className="font-medium text-green-600">{selectedTransaction.net.toLocaleString('fr-FR')} FCFA</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Methode</span><span className="font-medium text-gray-900">{selectedTransaction.method}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Statut</span><span>{getStatusBadge(selectedTransaction.status)}</span></div>
                <div className="py-2"><span className="text-gray-500 block mb-1">Description</span><span className="font-medium text-gray-900">{selectedTransaction.description}</span></div>
              </div>
              <div className="flex gap-3 mt-6"><button onClick={() => setShowDetailModal(false)} className="flex-1 px-4 py-2.5 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488] transition-colors">Fermer</button></div>
            </div>
          </div>
        )}

        {showRefundModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Rembourser la transaction</h3>
                <button onClick={() => setShowRefundModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"><i className="ri-close-line text-gray-500 text-xl"></i></button>
              </div>
              <p className="text-sm text-red-600 mb-6">Vous allez rembourser {selectedTransaction.amount.toLocaleString('fr-FR')} FCFA a {selectedTransaction.user}.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowRefundModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Annuler</button>
                <button onClick={() => void handleRefund()} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Confirmer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
