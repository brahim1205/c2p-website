import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPathForRole } from '@/hooks/useAuth';
import { apiRequest, toApiError } from '@/lib/api';
import { TwoFactorAuthForm } from './TwoFactorAuthForm';

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

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (e: FormEvent) => {
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
    <TwoFactorAuthForm
      code={code}
      errorText={errorText}
      isLoading={isLoading}
      pendingDevCodePreview={pendingTwoFactor?.devCodePreview}
      resendTimer={resendTimer}
      resetEmail={resetEmail}
      resetForm={resetForm}
      resetMode={resetMode}
      onCodeChange={handleCodeChange}
      onKeyDown={handleKeyDown}
      onResend={() => void handleResend()}
      onResetFormChange={setResetForm}
      onSubmit={(event) => void handleVerify(event)}
    />
  );
}
