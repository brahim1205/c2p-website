import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import { useCertificateBranding } from '@/hooks/useCertificateBranding';
import { useToast } from '@/hooks/useToast';
import { apiRequest } from '@/lib/api';
import type { CertificateBranding } from '@/lib/certificateVerification';
import { queryKeys } from '@/lib/queryKeys';
import { uploadImageToServer } from '@/lib/uploadApi';

/** Official C2P stamp and management signature printed on every certificate. */
export default function CertificateBrandingPanel() {
  const branding = useCertificateBranding();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [form, setForm] = useState({ director_name: '', director_title: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ director_name: branding?.director_name ?? '', director_title: branding?.director_title ?? '' });
  }, [branding?.director_name, branding?.director_title]);

  const save = async (patch: Partial<CertificateBranding>, message: string) => {
    setSaving(true);
    try {
      await apiRequest<CertificateBranding>('/learning/admin/certificate-branding', { method: 'PUT', body: JSON.stringify(patch) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.certificates.branding() });
      success('Certificats mis à jour', message);
    } catch (reason) {
      error('Enregistrement impossible', reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="admin-settings-panel-certificates" role="tabpanel" className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Cachet et signature des certificats</h2>
        <p className="mt-1 text-sm text-gray-600">
          Ces éléments apparaissent sur tous les certificats délivrés. Sans image, un cachet et une signature écrite sont générés automatiquement.
          Utilisez des images sur fond transparent (PNG) pour un rendu net.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ImageSlot label="Cachet officiel" url={branding?.stamp_url ?? null} busy={saving}
          onUploaded={(url) => save({ stamp_url: url }, 'Le cachet est appliqué aux certificats.')}
          onClear={() => save({ stamp_url: null }, 'Le cachet généré est de nouveau utilisé.')} />
        <ImageSlot label="Signature de la Direction" url={branding?.director_signature_url ?? null} busy={saving}
          onUploaded={(url) => save({ director_signature_url: url }, 'La signature est appliquée aux certificats.')}
          onClear={() => save({ director_signature_url: null }, 'La signature écrite générée est de nouveau utilisée.')} />
      </div>
      <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); void save(form, 'Le signataire est enregistré.'); }}>
        <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Nom du signataire</span>
          <input maxLength={80} value={form.director_name} onChange={(event) => setForm({ ...form, director_name: event.target.value })} placeholder="La Direction" className="c2p-input h-11 px-3 text-sm" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Fonction</span>
          <input maxLength={80} value={form.director_title} onChange={(event) => setForm({ ...form, director_title: event.target.value })} placeholder="Directeur général" className="c2p-input h-11 px-3 text-sm" /></label>
        <Button type="submit" loading={saving}>Enregistrer</Button>
      </form>
    </section>
  );
}

function ImageSlot({ label, url, busy, onUploaded, onClear }: {
  label: string; url: string | null; busy: boolean; onUploaded: (url: string) => unknown; onClear: () => unknown;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>
      <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
        {url ? <img src={url} alt={label} className="max-h-32 max-w-[90%] object-contain" /> : <span className="text-xs text-gray-400">Version générée automatiquement</span>}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setUploading(true);
        try {
          const uploaded = await uploadImageToServer(file, { folder: 'c2p/certificates/branding' });
          await onUploaded(uploaded.url);
        } finally {
          setUploading(false);
        }
      }} />
      <div className="mt-2 flex gap-3 text-sm">
        <button type="button" disabled={busy || uploading} onClick={() => input.current?.click()} className="font-semibold text-teal-700 hover:underline disabled:opacity-50">
          {uploading ? 'Envoi…' : url ? 'Remplacer' : 'Envoyer une image'}
        </button>
        {url ? <button type="button" disabled={busy} onClick={() => void onClear()} className="font-semibold text-red-600 hover:underline">Retirer</button> : null}
      </div>
    </div>
  );
}
