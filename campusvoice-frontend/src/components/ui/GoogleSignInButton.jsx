import { useEffect, useRef, useState } from 'react';
import { googleAuth } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ institutionId, onNeedInstitution }) {
  const ref = useRef(null);
  const initialized = useRef(false);
  const instRef = useRef(institutionId);
  instRef.current = institutionId;
  const { setCandidate } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleCredentialResponse(response) {
    if (!instRef.current) {
      if (onNeedInstitution) onNeedInstitution();
      return;
    }

    setLoading(true);
    try {
      const { data } = await googleAuth({
        token: response.credential,
        institution_id: instRef.current,
      });
      setCandidate(data.candidate);
      toast.success('Welcome!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Google sign-in failed');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google || initialized.current) return;
    initialized.current = true;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    window.google.accounts.id.renderButton(ref.current, {
      theme: 'outline',
      size: 'large',
      width: ref.current?.offsetWidth || 380,
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'center',
    });
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="w-full">
      {loading && (
        <div className="text-center text-sm text-text-muted py-2">Signing in...</div>
      )}
      <div ref={ref} className={loading ? 'opacity-50 pointer-events-none' : ''} />
    </div>
  );
}
