# SongNull

I built SongNull because managing your Spotify library manually is painfully slow. If you want to clear out a few thousand saved songs, the official app makes you click them one by one. 

This is a local-first dashboard that lets you search, select, and batch-delete your liked songs in seconds. 

It runs entirely in your browser using the Spotify Web API. No databases, no tracking, and your data stays on your machine.

## How to run it

You'll need a Spotify Developer account to get this working.

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create a new app.
2. Set the redirect URI to `http://localhost:5173/callback`.
3. Copy your Client ID.

Clone this repository and install dependencies:

```bash
npm install
```

Create a `.env.local` file in the root directory. Add your credentials:

```
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_REDIRECT_URI=http://localhost:5173/callback
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:5173` and log in with your Spotify account.

## How it works

Spotify limits bulk deletions to 40 tracks per API request. When you select hundreds of songs and hit delete, SongNull automatically chunks your selection into batches of 40 and fires them off sequentially. 

The app handles the PKCE authorization flow natively, meaning it never needs a backend server to store a client secret. Everything happens client-side.
