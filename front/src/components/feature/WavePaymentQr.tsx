import { C2P_WAVE_PAYMENT_URL } from '@/lib/wavePayment';

interface WavePaymentQrProps {
  compact?: boolean;
}

export default function WavePaymentQr({ compact = false }: WavePaymentQrProps) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-center">
      <p className="text-sm font-semibold text-slate-950">Paiement Wave C2P</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Scannez ce QR code avec Wave ou ouvrez le lien de paiement.
      </p>
      <div className="mt-3 flex justify-center">
        <img
          src="/images/wave-payment-qr.svg"
          alt="QR code de paiement Wave C2P"
          className={`${compact ? 'h-32 w-32' : 'h-44 w-44'} rounded-xl bg-white p-2 shadow-sm`}
        />
      </div>
      <a
        href={C2P_WAVE_PAYMENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex rounded-xl bg-[#1e90ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1677d8]"
      >
        Ouvrir Wave
      </a>
    </div>
  );
}
