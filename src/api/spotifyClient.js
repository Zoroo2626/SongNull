const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('No refresh token available');

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    // If refresh fails, clear everything so the user is forced to log in again
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();
  localStorage.setItem('access_token', data.access_token);
  if (data.refresh_token) {
    localStorage.setItem('refresh_token', data.refresh_token);
  }
  return data.access_token;
}

export async function spotifyFetch(url, options = {}) {
  let accessToken = localStorage.getItem('access_token');
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const defaultHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  let response = await fetch(url, config);

  // Handle 401 Unauthorized (Token Expired)
  if (response.status === 401) {
    accessToken = await refreshAccessToken();
    // Retry with new token
    config.headers.Authorization = `Bearer ${accessToken}`;
    response = await fetch(url, config);
  }

  // Handle 429 Too Many Requests
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const waitTime = parseInt(retryAfter, 10) * 1000;
      console.warn(`Rate limited by Spotify. Waiting ${waitTime}ms before retrying...`);
      await sleep(waitTime);
      // Retry after waiting
      return spotifyFetch(url, config);
    }
  }

  if (!response.ok) {
    let message = 'API request failed';
    try {
      const errorData = await response.json();
      message = errorData.error?.message || message;
    } catch (e) {
      // JSON parse failed
    }
    throw new Error(message);
  }

  return response;
}
