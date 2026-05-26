import type { FormEvent } from 'react';
import type { ContactSubmitState } from './contactSectionModel';

type NewsletterPanelProps = {
  email: string;
  state: ContactSubmitState;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function NewsletterPanel({ email, state, onEmailChange, onSubmit }: NewsletterPanelProps) {
  return (
    <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md lg:p-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5fa6f3]/10">
          <div className="flex h-5 w-5 items-center justify-center">
            <i className="ri-mail-send-line text-[#5fa6f3]" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-[#06053a]">Newsletter C2P</h3>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-gray-500">
        Recevez nos meilleures offres de formation, les nouveaux services AlloPresta et les opportunités de financement chaque semaine.
      </p>
      <form id="newsletter-contact-form" onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="Votre email"
          required
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm transition-all focus:border-[#5fa6f3] focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/30"
        />
        <input type="hidden" name="subject" value="newsletter" />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#5fa6f3] px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-[#27346b] active:scale-95"
        >
          {state === 'loading' ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>
              <span>S'inscrire</span>
              <div className="flex h-4 w-4 items-center justify-center">
                <i className="ri-arrow-right-line" />
              </div>
            </>
          )}
        </button>
      </form>
      <NewsletterStatus state={state} />
    </div>
  );
}

function NewsletterStatus({ state }: { state: ContactSubmitState }) {
  if (state === 'success') {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">
        <div className="flex h-5 w-5 items-center justify-center">
          <i className="ri-check-line" />
        </div>
        <span>Inscription confirmée ! Merci de votre confiance.</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
        <div className="flex h-5 w-5 items-center justify-center">
          <i className="ri-error-warning-line" />
        </div>
        <span>Une erreur est survenue. Veuillez réessayer.</span>
      </div>
    );
  }

  return null;
}
