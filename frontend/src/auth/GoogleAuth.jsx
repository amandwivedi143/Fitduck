import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Your Google OAuth Client ID (Web application type).
const GOOGLE_CLIENT_ID =
  '775509038693-bshcj00biq64gdc5r09ilnk18serure0.apps.googleusercontent.com';

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

    // Load GIS script dynamically.
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Initialize the GIS button once the script loads.
      if (buttonRef.current && window.google) {
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
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [handleCredentialResponse]);

  return (
    <div
      ref={buttonRef}
      style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}
    />
  );
}
