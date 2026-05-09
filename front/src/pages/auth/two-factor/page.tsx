import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import BrandLogo from '@/components/base/BrandLogo';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPathForRole } from '@/hooks/useAuth';
import { apiRequest, toApiError } from '@/lib/api';

export default function TwoFactorAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error } = useToast();
  const { verify2FA, resend2FA, isLoading, pendingTwoFactor } = useAuth();
  const resetMode = location.state?.mode === 'password-reset';
  const resetEmail = useMemo(() => String(location.state?.email ?? '').trim().toLowerCase(), [location.state]);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [errorText, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [resetForm, setResetForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!resetMode) {
      navigate('/auth/login', { replace: true });
    }
  }, [navigate, resetMode]);

  if (!resetMode) {
    return null;
  }

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const verificationCode = code.join('');

    if (verificationCode.length !== 6) {
      error('Code incomplet', 'Veuillez entrer les 6 chiffres du code.');
      return;
    }

    setError('');
    if (resetMode) {
      if (!resetEmail) {
        error('Session invalide', 'Veuillez recommencer la reinitialisation du mot de passe.');
        navigate('/forgot-password', { replace: true });
        return;
      }
      if (!resetForm.newPassword || !resetForm.confirmPassword) {
        error('Champs incomplets', 'Renseignez le nouveau mot de passe et sa confirmation.');
        return;
      }
      if (resetForm.newPassword !== resetForm.confirmPassword) {
        error('Confirmation invalide', 'Les deux mots de passe ne correspondent pas.');
        return;
      }

      try {
        const result = await apiRequest<{ success: boolean; message: string }>('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            email: resetEmail,
            code: verificationCode,
            newPassword: resetForm.newPassword,
          }),
        }, { retryOnAuth: false });
        success('Mot de passe reinitialise', result.message);
        setTimeout(() => navigate('/auth/login', { replace: true }), 800);
      } catch (requestError) {
        const apiError = toApiError(requestError);
        error('Verification impossible', apiError.message);
      }
      return;
    }

    const result = await verify2FA(verificationCode);

    if (!result.success) {
      error('Code invalide', result.message || 'Veuillez vérifier votre code.');
      return;
    }

    success('Authentification réussie', 'Redirection vers votre tableau de bord...');
    const target = location.state?.from || getDashboardPathForRole(result.user?.role || pendingTwoFactor?.user.role || 'client');
    setTimeout(() => navigate(target), 800);
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    if (resetMode) {
      if (!resetEmail) {
        error('Session invalide', 'Veuillez recommencer la reinitialisation du mot de passe.');
        navigate('/forgot-password', { replace: true });
        return;
      }
      try {
        await apiRequest<{ message: string }>('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: resetEmail }),
        }, { retryOnAuth: false });
        success('Code renvoye', 'Un nouveau code a ete envoye si le compte existe.');
      } catch (requestError) {
        const apiError = toApiError(requestError);
        error('Renvoi impossible', apiError.message);
        return;
      }
      setResendTimer(60);
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return;
    }

    const result = await resend2FA();
    if (!result.success) {
      error('Renvoi impossible', result.message || 'Le code n a pas pu etre renvoye.');
      return;
    }
    success('Code renvoyé', 'Un nouveau code a été envoyé à votre téléphone.');
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <BrandLogo
          to="/"
          className="mb-8 flex items-center justify-center"
          imageClassName="h-14 w-auto object-contain"
        />

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-shield-check-line text-teal-600 text-3xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {resetMode ? 'Verification de securite' : 'Authentification a deux facteurs'}
            </h1>
            <p className="text-gray-600">
              {resetMode
                ? 'Entrez le code a 6 chiffres envoye pour reinitialiser votre mot de passe.'
                : 'Entrez le code a 6 chiffres envoye par votre canal de verification'}
            </p>
            {resetMode && resetEmail && (
              <p className="text-sm text-gray-500 mt-2">Compte concerne: {resetEmail}</p>
            )}
            {!resetMode && pendingTwoFactor?.devCodePreview && (
              <p className="text-sm text-teal-600 mt-2 font-medium">Code de test local : {pendingTwoFactor.devCodePreview}</p>
            )}
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            {/* Code Input */}
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
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 transition-colors"
                    disabled={isLoading}
                  />
                ))}
              </div>
              {errorText && (
                <p className="text-red-600 text-sm mt-3 text-center flex items-center justify-center">
                  <i className="ri-error-warning-line mr-1"></i>
                  {errorText}
                </p>
              )}
            </div>

            {resetMode && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={resetForm.newPassword}
                    onChange={(e) => setResetForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 transition-colors"
                    placeholder="Minimum 10 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={resetForm.confirmPassword}
                    onChange={(e) => setResetForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isLoading || code.join('').length !== 6}
              className={`w-full px-6 py-4 rounded-lg font-semibold transition-all whitespace-nowrap ${
                isLoading || code.join('').length !== 6
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:from-teal-600 hover:to-blue-700'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  Vérification...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <i className="ri-check-line mr-2"></i>
                  {resetMode ? 'Valider et reinitialiser' : 'Verifier le code'}
                </span>
              )}
            </button>

            {/* Resend Code */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Vous n'avez pas reçu le code ?</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0}
                className={`text-sm font-medium transition-colors ${
                  resendTimer > 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-teal-600 hover:text-teal-700'
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
          </form>

          {/* Security Info */}
          <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <i className="ri-information-line text-teal-600 text-xl flex-shrink-0 mt-0.5"></i>
              <div>
                <p className="text-sm font-medium text-teal-900 mb-1">Sécurité renforcée</p>
                <p className="text-xs text-teal-800">
                  {resetMode
                    ? 'Le code de verification protege la reinitialisation du mot de passe. Il expire dans 10 minutes.'
                    : "L'authentification à deux facteurs protege votre compte contre les acces non autorises. Ce code expire dans 10 minutes."}
                </p>
              </div>
            </div>
          </div>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link to="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              <i className="ri-arrow-left-line mr-1"></i>
              Retour à la connexion
            </Link>
          </div>
        </div>

        {/* Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Besoin d'aide ?{' '}
            <a href="mailto:support@c2p.sn" className="text-teal-600 hover:text-teal-700 font-medium">
              Contactez le support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
