import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '775509038693-bshcj00biq64gdc5r09ilnk18serure0.apps.googleusercontent.com';

/**
 * Loads Google Identity Services (accounts.google.com/gsi/client) once and
 * renders a "Sign in with Google" button using the GIS prompt() API.
 *
 * After the user consents, GIS calls our callback with a `credential` (the
 * Google ID token). We send it to our gateway which validates + mints the
 * app JWT cookie.
 */
export default function GoogleAuthButton() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const googleInitialized = useRef(false);

  const handleCredentialResponse = useCallback(
    async (response) => {
      if (response.credential) {
        try {
          await loginWithGoogle(response.credential);
          navigate('/dashboard', { replace: true });
        } catch (err) {
          // swallow and log — navigation will not occur on failure
          // eslint-disable-next-line no-console
          console.error('Google login error', err);
        }
      }
    },
    [loginWithGoogle, navigate],
  );

  useEffect(() => {
    if (googleInitialized.current) return;
    if (!GOOGLE_CLIENT_ID) return;

    const initGoogleButton = () => {
      if (!buttonRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'filled_black',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        width: 320,
      });
      googleInitialized.current = true;
    };

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      if (window.google?.accounts?.id) {
        initGoogleButton();
      } else {
        existingScript.addEventListener('load', initGoogleButton, { once: true });
      }
      return undefined;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogleButton;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, [handleCredentialResponse]);

  return (
    <div
      ref={buttonRef}
      style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}
    />
  );
}
