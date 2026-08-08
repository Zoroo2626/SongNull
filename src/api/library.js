import { spotifyFetch } from './spotifyClient';

export const getSavedTracks = async (limit = 50, offset = 0) => {
  const url = `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}&market=from_token`;
  const response = await spotifyFetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch saved tracks');
  }
  return response.json();
};

export const deleteSavedTracks = async (uris) => {
  // Spotify API accepts up to 40 URIs at once for deletion via query parameters.
  const url = `https://api.spotify.com/v1/me/library?uris=${encodeURIComponent(uris.join(','))}`;
  const response = await spotifyFetch(url, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Failed to delete tracks');
  }
  
  return true;
};

export const restoreSavedTracks = async (uris) => {
  const url = `https://api.spotify.com/v1/me/library?uris=${encodeURIComponent(uris.join(','))}`;
  const response = await spotifyFetch(url, {
    method: 'PUT'
  });
  if (!response.ok) throw new Error('Failed to restore tracks');
  return true;
};

export const getUserPlaylists = async (limit = 50, offset = 0) => {
  const url = `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`;
  const response = await spotifyFetch(url);
  if (!response.ok) throw new Error('Failed to fetch playlists');
  return response.json();
};

export const getPlaylistTracks = async (playlistId, limit = 50, offset = 0) => {
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=${limit}&offset=${offset}&market=from_token`;
  const response = await spotifyFetch(url);
  if (!response.ok) throw new Error('Failed to fetch playlist tracks');
  return response.json();
};

export const deletePlaylistTracks = async (playlistId, uris) => {
  // API accepts up to 100 tracks per request. uris is an array of objects: { uri: "spotify:track:..." }
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/items`;
  const response = await spotifyFetch(url, {
    method: 'DELETE',
    body: JSON.stringify({ tracks: uris })
  });
  if (!response.ok) throw new Error('Failed to delete playlist tracks');
  return true;
};

export const restorePlaylistTracks = async (playlistId, uris) => {
  // uris is an array of strings: "spotify:track:..."
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/items`;
  const response = await spotifyFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uris }) // restore at the end
  });
  if (!response.ok) throw new Error('Failed to restore playlist tracks');
  return true;
};
