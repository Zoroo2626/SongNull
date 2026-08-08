import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const redirectUri = import.meta.env.VITE_REDIRECT_URI;

export default function Callback() {
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const hasAttemptedAuth = React.useRef(false);

  useEffect(() => {
    if (hasAttemptedAuth.current) return;
    hasAttemptedAuth.current = true;

    const exchangeCodeForToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const errorQuery = urlParams.get('error');

      if (errorQuery) {
        setError(errorQuery);
        return;
      }

      if (!code) {
        setError('No authorization code found');
        return;
      }

      const savedState = window.localStorage.getItem('auth_state');
      if (state !== savedState) {
        setError('State mismatch error (possible CSRF attack)');
        return;
      }

      window.localStorage.removeItem('auth_state'); // Clear state

      const codeVerifier = window.localStorage.getItem('code_verifier');
      if (!codeVerifier) {
        setError('No code verifier found in local storage');
        return;
      }

      const body = new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      });

      try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error_description || 'Failed to exchange token');
        }

        const data = await response.json();
        
        login(data.access_token, data.refresh_token);
        
        // Clean up verifier
        window.localStorage.removeItem('code_verifier');
        
        // Redirect to dashboard
        navigate('/');
      } catch (err) {
        setError(err.message);
      }
    };

    exchangeCodeForToken();
  }, [login, navigate]);

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/login')}>Try Again</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Authenticating...</p>
    </div>
  );
}
