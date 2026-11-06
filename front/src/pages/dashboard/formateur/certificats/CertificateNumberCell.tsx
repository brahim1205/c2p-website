import { useState } from 'react';

const MAX_VISIBLE = 22;

/** Keeps the start (prefix and year) and the end (unique part) of long legacy numbers. */
function shortenCertificateNumber(value: string) {
  if (value.length <= MAX_VISIBLE) return value;
  return `${value.slice(0, 13)}…${value.slice(-6)}`;
}

export function CertificateNumberCell({ value }: { value?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-sm text-gray-400">-</span>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="font-mono text-xs text-gray-600" title={value}>{shortenCertificateNumber(value)}</span>
      <button
        type="button"
        onClick={copy}
        title={copied ? 'Copié' : 'Copier le numéro'}
        aria-label={copied ? 'Numéro copié' : 'Copier le numéro du certificat'}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        <i className={`${copied ? 'ri-check-line text-teal-600' : 'ri-file-copy-line'} text-sm`}></i>
      </button>
    </div>
  );
}
