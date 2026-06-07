import type { FormEvent, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ResetPasswordFields, type ResetFormState } from './ResetPasswordFields';

interface TwoFactorAuthFormProps {
  code: string[];
  errorText: string;
  isLoading: boolean;
  pendingDevCodePreview?: string;
  resendTimer: number;
  resetEmail: string;
  resetForm: ResetFormState;
  resetMode: boolean;
  onCodeChange: (index: number, value: string) => void;
  onKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
  onResend: () => void;
  onResetFormChange: (next: ResetFormState) => void;
  onSubmit: (event: FormEvent) => void;
}

export function TwoFactorAuthForm({
  code,
  errorText,
  isLoading,
  pendingDevCodePreview,
  resendTimer,
  resetEmail,
  resetForm,
  resetMode,
  onCodeChange,
  onKeyDown,
  onResend,
  onResetFormChange,
  onSubmit,
}: TwoFactorAuthFormProps) {
  const verificationCode = code.join('');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
          <TwoFactorHeader resetEmail={resetEmail} resetMode={resetMode} pendingDevCodePreview={pendingDevCodePreview} />

          <form onSubmit={onSubmit} className="space-y-6">
            <CodeInputs
              code={code}
              disabled={isLoading}
              errorText={errorText}
              onCodeChange={onCodeChange}
              onKeyDown={onKeyDown}
            />

            {resetMode && (
              <ResetPasswordFields
                resetForm={resetForm}
                onResetFormChange={onResetFormChange}
              />
            )}

            <VerifyButton isLoading={isLoading} resetMode={resetMode} verificationCode={verificationCode} />
            <ResendCodeButton resetMode={resetMode} resendTimer={resendTimer} onResend={onResend} />
          </form>

          <SecurityNotice resetMode={resetMode} />

          <div className="mt-6 text-center">
            <Link to="/auth/login" className="text-sm text-gray-600 transition-colors hover:text-gray-900">
              <i className="ri-arrow-left-line mr-1"></i>
              Retour à la connexion
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Besoin d'aide ?{' '}
            <a href="mailto:support@c2p.sn" className="font-medium text-teal-600 hover:text-teal-700">
              Contactez le support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function TwoFactorHeader({
  pendingDevCodePreview,
  resetEmail,
  resetMode,
}: Pick<TwoFactorAuthFormProps, 'pendingDevCodePreview' | 'resetEmail' | 'resetMode'>) {
  return (
    <div className="mb-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
        <i className="ri-shield-check-line text-3xl text-teal-600"></i>
      </div>
      <h1 className="mb-2 text-3xl font-bold text-gray-900">
        {resetMode ? 'Vérification de sécurité' : 'Authentification à deux facteurs'}
      </h1>
      <p className="text-gray-600">
        {resetMode
          ? 'Entrez le code à 6 chiffres envoyé pour réinitialiser votre mot de passe.'
          : 'Entrez le code à 6 chiffres envoyé par votre canal de vérification'}
      </p>
      {resetMode && resetEmail && <p className="mt-2 text-sm text-gray-500">Compte concerné: {resetEmail}</p>}
      {!resetMode && pendingDevCodePreview && (
        <p className="mt-2 text-sm font-medium text-teal-600">Code de test local : {pendingDevCodePreview}</p>
      )}
    </div>
  );
}

function CodeInputs({
  code,
  disabled,
  errorText,
  onCodeChange,
  onKeyDown,
}: {
  code: string[];
  disabled: boolean;
  errorText: string;
  onCodeChange: TwoFactorAuthFormProps['onCodeChange'];
  onKeyDown: TwoFactorAuthFormProps['onKeyDown'];
}) {
  return (
    <div>
      <div className="flex justify-center space-x-3">
        {code.map((digit, index) => (
          <input
            key={index}
            id={`code-${index}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(event) => onCodeChange(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event)}
            className="h-14 w-12 rounded-lg border-2 border-gray-300 text-center text-2xl font-bold transition-colors focus:border-teal-500 focus:outline-none"
            disabled={disabled}
          />
        ))}
      </div>
      {errorText && (
        <p className="mt-3 flex items-center justify-center text-center text-sm text-red-600">
          <i className="ri-error-warning-line mr-1"></i>
          {errorText}
        </p>
      )}
    </div>
  );
}

function VerifyButton({
  isLoading,
  resetMode,
  verificationCode,
}: Pick<TwoFactorAuthFormProps, 'isLoading' | 'resetMode'> & { verificationCode: string }) {
  const disabled = isLoading || verificationCode.length !== 6;

  return (
    <button
      type="submit"
      disabled={disabled}
      className={`w-full whitespace-nowrap rounded-lg px-6 py-4 font-semibold transition-all ${
        disabled
          ? 'cursor-not-allowed bg-gray-300 text-gray-500'
          : 'bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:from-teal-600 hover:to-blue-700'
      }`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <i className="ri-loader-4-line mr-2 animate-spin"></i>
          Vérification...
        </span>
      ) : (
        <span className="flex items-center justify-center">
          <i className="ri-check-line mr-2"></i>
          {resetMode ? 'Valider et réinitialiser' : 'Vérifier le code'}
        </span>
      )}
    </button>
  );
}

function ResendCodeButton({
  resetMode,
  resendTimer,
  onResend,
}: Pick<TwoFactorAuthFormProps, 'resetMode' | 'resendTimer' | 'onResend'>) {
  return (
    <div className="text-center">
      <p className="mb-2 text-sm text-gray-600">Vous n'avez pas reçu le code ?</p>
      <button
        type="button"
        onClick={onResend}
        disabled={resendTimer > 0}
        className={`text-sm font-medium transition-colors ${
          resendTimer > 0 ? 'cursor-not-allowed text-gray-400' : 'text-teal-600 hover:text-teal-700'
        }`}
      >
        {resendTimer > 0 ? (
          `Renvoyer le code dans ${resendTimer}s`
        ) : (
          <span className="flex items-center justify-center">
            <i className="ri-refresh-line mr-1"></i>
            {resetMode ? 'Renvoyer le code SMS' : 'Renvoyer le code'}
          </span>
        )}
      </button>
    </div>
  );
}

function SecurityNotice({ resetMode }: Pick<TwoFactorAuthFormProps, 'resetMode'>) {
  return (
    <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-4">
      <div className="flex items-start space-x-3">
        <i className="ri-information-line mt-0.5 flex-shrink-0 text-xl text-teal-600"></i>
        <div>
          <p className="mb-1 text-sm font-medium text-teal-900">Sécurité renforcée</p>
          <p className="text-xs text-teal-800">
            {resetMode
              ? 'Le code de vérification protège la réinitialisation du mot de passe. Il expire dans 10 minutes.'
              : "L'authentification à deux facteurs protège votre compte contre les accès non autorisés. Ce code expire dans 10 minutes."}
          </p>
        </div>
      </div>
    </div>
  );
}
