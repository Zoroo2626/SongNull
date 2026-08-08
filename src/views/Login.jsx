import React from 'react';
import { generateRandomString, generateCodeChallenge } from '../utils/pkce';
import MoltenMetal from '../components/MoltenMetal';
import ParticleText from '../components/ParticleText';
import { LogIn } from 'lucide-react';

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const redirectUri = import.meta.env.VITE_REDIRECT_URI;
const scope = 'user-library-read user-library-modify playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private';

export default function Login() {
  const handleLogin = async () => {
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomString(16);

    // Save verifier and state to localStorage for the callback to verify
    window.localStorage.setItem('code_verifier', codeVerifier);
    window.localStorage.setItem('auth_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: scope,
      redirect_uri: redirectUri,
      state: state,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  return (
    <div className="login-container" style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Background Strands */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MoltenMetal 
          color1="#000000"
          color2="#1db954"
          color3="#ffffff"
          speed={0.35}
          scale={4}
          detail={3}
          glow={1.6}
          coreSize={0.1}
          swirl={1}
          fold={-0.2}
          blackPoint={0.05}
          brightness={1.3}
          colorMode="molten"
          grain={true}
          grainIntensity={0.05}
          mouseInteraction={true}
          mouseStrength={0.3}
          opacity={1.0}
        />
      </div>

      {/* Foreground Content */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        zIndex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: 'radial-gradient(circle at center, transparent 0%, var(--color-bg-base) 90%)'
      }}>
        <div style={{ width: '100%', maxWidth: '800px', height: '240px', marginBottom: '2rem' }}>
          <ParticleText
            text="SongNull"
            particleSize={3}
            density={3}
            color="#ffffff"
            highlightColor="#1ed760"
            scatter={200}
            gatherDuration={1800}
            stagger={300}
            pointerRepel={60}
            repelRadius={150}
            glow={true}
          />
        </div>
        
        <div className="glass-panel" style={{ 
          padding: 'var(--space-6) var(--space-8)', 
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
          maxWidth: '400px'
        }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>
            Batch delete saved tracks from your Spotify library in seconds.
          </p>
          <button onClick={handleLogin} className="btn btn-primary" style={{ width: '100%' }}>
            <LogIn size={20} /> Connect Spotify
          </button>
        </div>
      </div>
    </div>
  );
}
