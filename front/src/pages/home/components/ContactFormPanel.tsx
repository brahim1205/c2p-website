import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { contactSubjectOptions, type ContactSubmitState } from './contactSectionModel';

export type ContactFormPanelProps = {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  state: ContactSubmitState;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function ContactFormPanel({
  firstName,
  lastName,
  email,
  subject,
  message,
  state,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onSubjectChange,
  onMessageChange,
  onSubmit,
}: ContactFormPanelProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
      <h3 className="mb-1 text-xl font-semibold text-[#06053a]">Envoyez-nous un message</h3>
      <p className="mb-6 text-sm text-gray-500">Nous vous répondons sous 24h ouvrées.</p>

      <form onSubmit={onSubmit} id="contact-form-main" className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput label="Prénom" name="prenom" value={firstName} onChange={onFirstNameChange} placeholder="Jean" />
          <TextInput label="Nom" name="nom" value={lastName} onChange={onLastNameChange} placeholder="Dupont" />
        </div>

        <TextInput label="Email" name="email" value={email} onChange={onEmailChange} placeholder="jean.dupont@email.com" type="email" />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Sujet</label>
          <select
            name="subject"
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm transition-all focus:border-[#5fa6f3] focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/30"
          >
            {contactSubjectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Message</label>
          <textarea
            name="message"
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            required
            rows={5}
            maxLength={500}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm transition-all focus:border-[#5fa6f3] focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/30"
            placeholder="Décrivez votre demande..."
          />
          <div className="mt-1 text-right text-xs text-gray-400">{message.length}/500</div>
        </div>

        <button
          type="submit"
          disabled={state === 'loading'}
          className="group inline-flex w-full items-center justify-center gap-3 whitespace-nowrap rounded-xl bg-[#06053a] px-6 py-4 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-[#5fa6f3] active:scale-95"
        >
          {state === 'loading' ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Envoi en cours...</span>
            </>
          ) : (
            <>
              <span>Envoyer le message</span>
              <div className="flex h-5 w-5 items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                <i className="ri-send-plane-line" />
              </div>
            </>
          )}
        </button>

        <ContactFormStatus state={state} />
      </form>
    </div>
  );
}

export function ContactCtas() {
  return (
    <div className="mt-6 flex flex-col gap-4 sm:flex-row">
      <Link
        to="/a-propos"
        className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-[#06053a] transition-all duration-300 hover:border-[#5fa6f3] hover:bg-[#5fa6f3]/5 hover:text-[#5fa6f3]"
      >
        <div className="flex h-5 w-5 items-center justify-center">
          <i className="ri-information-line" />
        </div>
        <span>En savoir plus sur C2P</span>
      </Link>
      <Link
        to="/auth/register"
        className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#5fa6f3]/10 px-5 py-3 text-sm font-medium text-[#5fa6f3] transition-all duration-300 hover:bg-[#5fa6f3]/20"
      >
        <div className="flex h-5 w-5 items-center justify-center">
          <i className="ri-user-add-line" />
        </div>
        <span>Créer un compte</span>
      </Link>
    </div>
  );
}

function TextInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm transition-all focus:border-[#5fa6f3] focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/30"
        placeholder={placeholder}
      />
    </div>
  );
}

function ContactFormStatus({ state }: { state: ContactSubmitState }) {
  if (state === 'success') {
    return <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">Message envoyé. Nous revenons vers vous rapidement.</div>;
  }

  if (state === 'error') {
    return <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Impossible d&apos;envoyer le message pour le moment.</div>;
  }

  return null;
}
