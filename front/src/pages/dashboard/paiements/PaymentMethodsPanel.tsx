import WavePaymentQr from '@/components/feature/WavePaymentQr';
import { paymentMethods } from './paymentPageModel';

export default function PaymentMethodsPanel() {
  const visibleMethods = paymentMethods.filter((method) => method.id !== 'dexpay');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-600">Canaux acceptés par C2P pour les paiements et retraits.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WavePaymentQr compact />
        {visibleMethods.map((method) => {
          const methodAvailable = method.active;
          return (
            <div
              key={method.id}
              className={`border-2 rounded-lg p-6 transition-all ${
                methodAvailable ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${method.color} rounded-lg flex items-center justify-center`}>
                    <div className="w-6 h-6 flex items-center justify-center"><i className={`${method.icon} text-xl text-white`}></i></div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{method.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {method.active ? 'Disponible via C2P' : 'À connecter ultérieurement'}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  methodAvailable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-1 ${methodAvailable ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  {method.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Les informations sensibles sont validées au moment de la transaction ou du retrait.
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
