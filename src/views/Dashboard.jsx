import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { spotifyFetch } from '../api/spotifyClient';
import { getSavedTracks, deleteSavedTracks, restoreSavedTracks, getUserPlaylists, getPlaylistTracks, deletePlaylistTracks, restorePlaylistTracks } from '../api/library';
import ConfirmationModal from '../components/ConfirmationModal';
import LightTunnel from '../components/LightTunnel';
import OptionWheel from '../components/OptionWheel';
import { Trash2, LogOut, CheckSquare, Square, Search, Loader2, Music, History, Copy, Ghost, Undo2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  
  // Library / Playlist state
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null); // null = Saved Tracks, string = playlist ID
  const activePlaylistRef = useRef(activePlaylist);
  const previousPlaylistRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Update ref on change
  useEffect(() => {
    activePlaylistRef.current = activePlaylist;
    if (activePlaylist !== 'UNDO_BIN') {
      previousPlaylistRef.current = activePlaylist;
    }
  }, [activePlaylist]);
  const [tracks, setTracks] = useState([]);
  
  // Fetching state
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [totalTracks, setTotalTracks] = useState(0);
  const [trackOffset, setTrackOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set()); // Will store track IDs
  const [searchQuery, setSearchQuery] = useState('');
  
  // Deletion state
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  // Undo Log state
  const [deletedLog, setDeletedLog] = useState([]);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const savedLog = localStorage.getItem('songnull_deleted_log');
    if (savedLog) {
      setDeletedLog(JSON.parse(savedLog));
    }
  }, []);

  // Initial Load (Profile & Playlists)
  useEffect(() => {
    const fetchProfileAndPlaylists = async () => {
      try {
        // 1. Get user profile
        const response = await spotifyFetch('https://api.spotify.com/v1/me');
        const userData = await response.json();
        setProfile(userData);

        // 2. Get all playlists
        let allPlaylists = [];
        let url = 'https://api.spotify.com/v1/me/playlists?limit=50';
        while (url) {
          const res = await spotifyFetch(url);
          if (!res.ok) break;
          const data = await res.json();
          allPlaylists = [...allPlaylists, ...data.items];
          url = data.next;
        }
        
        // 3. Filter for editable playlists only (owned by user or collaborative)
        // Spotify Developer Mode blocks reading tracks from 3rd party or algorithmic playlists.
        // Plus, users can't delete from playlists they don't own anyway.
        const editablePlaylists = allPlaylists.filter(p => 
          p !== null && (p.owner?.id === userData.id || p.collaborative)
        );
        
        setPlaylists(editablePlaylists);
      } catch (err) {
        console.error('Failed to load library data', err);
      }
    };

    fetchProfileAndPlaylists();
  }, []);

  // Fetch Tracks based on activePlaylist
  const fetchTracks = useCallback(async (offset = 0, playlistId = null) => {
    try {
      setErrorMsg(null);
      setFetchingMore(true);
      if (offset === 0) setLoading(true);
      
      let response;
      let fetchLimit = 50;
      if (playlistId) {
        fetchLimit = 100;
        response = await getPlaylistTracks(playlistId, fetchLimit, offset);
      } else {
        response = await getSavedTracks(fetchLimit, offset);
      }
        
      const newTracks = response.items.map(item => item?.track || item?.item || item?.episode || item).filter(t => t && (t.id || t.uri));
      
      if (playlistId !== activePlaylistRef.current) return;

      setTracks(prev => {
        if (offset === 0) return newTracks;
        const existingIds = new Set(prev.map(t => t.id || t.uri));
        return [...prev, ...newTracks.filter(t => !existingIds.has(t.id || t.uri))];
      });
      
      setTotalTracks(response.total);
      
      if (response.items.length > 0 && response.next) {
        setTrackOffset(offset + fetchLimit);
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load tracks', err);
      const pName = activePlaylistRef.current ? playlists.find(p => p.id === activePlaylistRef.current)?.name : 'Liked Songs';
      setErrorMsg(`Failed to load tracks for ${pName || 'unknown'}: ${err.message}`);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  }, [playlists]);

  // Trigger track fetch when activePlaylist changes
  useEffect(() => {
    setSelectedIds(new Set());
    setSearchQuery('');
    setTrackOffset(0);
    setHasMore(false);
    setTracks([]);
    if (activePlaylist !== 'UNDO_BIN') {
      fetchTracks(0, activePlaylist);
    }
  }, [activePlaylist, fetchTracks]);

  // Handle UNDO_BIN population
  useEffect(() => {
    if (activePlaylist === 'UNDO_BIN') {
      const flatTracks = [];
      deletedLog.forEach(log => {
        if (log.tracks) {
          log.tracks.forEach(track => {
            flatTracks.push({
              ...track,
              _logId: log.id,
              _playlistId: log.playlistId
            });
          });
        }
      });
      setTracks(flatTracks);
      setTotalTracks(flatTracks.length);
      setLoading(false);
      setErrorMsg(null);
    }
  }, [activePlaylist, deletedLog]);

  // Load remaining tracks in background
  useEffect(() => {
    if (hasMore && !fetchingMore && !loading) {
      const timer = setTimeout(() => {
        fetchTracks(trackOffset, activePlaylist);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasMore, trackOffset, fetchingMore, loading, fetchTracks, activePlaylist]);

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const filteredTracks = tracks.filter(t => 
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.artists?.some(a => a.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const allFilteredSelected = filteredTracks.length > 0 && filteredTracks.every(t => selectedIds.has(t.id || t.uri));

  const selectAll = () => {
    if (allFilteredSelected) {
      const newSelected = new Set(selectedIds);
      filteredTracks.forEach(t => newSelected.delete(t.id || t.uri));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      filteredTracks.forEach(t => newSelected.add(t.id || t.uri));
      setSelectedIds(newSelected);
    }
  };

  const normalizeTrackName = (name) => {
    if (!name) return '';
    return name.toLowerCase().split(' - ')[0].replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');
  };

  const selectDuplicates = () => {
    const newSelected = new Set(selectedIds);
    const seen = new Set();
    let addedCount = 0;
    
    filteredTracks.forEach(t => {
      const normName = normalizeTrackName(t.name);
      const normArtist = t.artists?.[0]?.name ? t.artists[0].name.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
      const key = `${normName}-${normArtist}`;
      
      if (seen.has(key) || (t.uri && seen.has(t.uri))) {
        newSelected.add(t.id || t.uri);
        addedCount++;
      } else {
        seen.add(key);
        if (t.uri) seen.add(t.uri);
      }
    });
    
    setSelectedIds(newSelected);
    if (addedCount > 0) alert(`Selected ${addedCount} duplicate tracks!`);
    else alert('No duplicates found in current view.');
  };

  const selectDeadTracks = () => {
    const newSelected = new Set(selectedIds);
    let addedCount = 0;
    
    filteredTracks.forEach(t => {
      const isDead = !t.is_local && (
        t.is_playable === false || 
        t.restrictions != null || 
        (Array.isArray(t.available_markets) && t.available_markets.length === 0) ||
        (t.id == null && t.uri == null)
      );
      if (isDead) {
        newSelected.add(t.id || t.uri);
        addedCount++;
      }
    });
    
    setSelectedIds(newSelected);
    if (addedCount > 0) alert(`Selected ${addedCount} dead/unplayable tracks!`);
    else alert('No dead tracks found in current view.');
  };

  const confirmBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setProgressTotal(selectedIds.size);
    setProgressCurrent(0);
    setIsModalOpen(true);
  };

  const executeBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);
      
      if (activePlaylist) {
        // Delete from custom playlist (max 100 per request)
        for (let i = 0; i < idsArray.length; i += 100) {
          const chunkIds = idsArray.slice(i, i + 100);
          // Look up track URIs for the selected IDs
          const trackUris = chunkIds.map(id => ({ uri: tracks.find(t => (t.id || t.uri) === id)?.uri })).filter(u => u.uri);
          
          await deletePlaylistTracks(activePlaylist, trackUris);
          setProgressCurrent(prev => prev + chunkIds.length);
        }
      } else {
        // Delete from Liked Songs (max 40 per request)
        for (let i = 0; i < idsArray.length; i += 40) {
          const chunkIds = idsArray.slice(i, i + 40);
          const trackUris = chunkIds.map(id => tracks.find(t => (t.id || t.uri) === id)?.uri).filter(u => u);
          await deleteSavedTracks(trackUris);
          setProgressCurrent(prev => prev + chunkIds.length);
        }
      }
      // Log deleted tracks
      const deletedTracks = idsArray.map(id => {
        const t = tracks.find(t => (t.id || t.uri) === id);
        if (!t) return null;
        return {
          id: t.id,
          uri: t.uri,
          name: t.name,
          artists: t.artists,
          album: t.album,
          is_playable: t.is_playable,
          is_local: t.is_local,
          available_markets: t.available_markets
        };
      }).filter(Boolean);
      
      const logEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        playlistId: activePlaylist,
        uris: deletedTracks.map(t => t.uri),
        tracks: deletedTracks,
        count: deletedTracks.length,
      };
      const newLog = [logEntry, ...deletedLog].slice(0, 50);
      setDeletedLog(newLog);
      localStorage.setItem('songnull_deleted_log', JSON.stringify(newLog));

      // Update local state
      setTracks(prev => prev.filter(t => !selectedIds.has(t.id || t.uri)));
      setSelectedIds(new Set());
      
      setTimeout(() => setIsModalOpen(false), 500);
    } catch (err) {
      console.error('Failed to delete tracks', err);
      alert('Failed to delete some tracks. Check console.');
    } finally {
      setIsDeleting(false);
    }
  };

  const executeBulkRestore = async () => {
    setIsRestoring(true);
    try {
      const selectedTracks = tracks.filter(t => selectedIds.has(t.id || t.uri));
      
      const groups = {};
      selectedTracks.forEach(t => {
        const pId = t._playlistId || 'liked-songs';
        if (!groups[pId]) groups[pId] = [];
        groups[pId].push(t.uri);
      });

      for (const [pId, uris] of Object.entries(groups)) {
        if (pId === 'liked-songs') {
          for (let i = 0; i < uris.length; i += 40) {
            await restoreSavedTracks(uris.slice(i, i + 40));
          }
        } else {
          for (let i = 0; i < uris.length; i += 100) {
            await restorePlaylistTracks(pId, uris.slice(i, i + 100));
          }
        }
      }

      const newLog = deletedLog.map(log => {
        if (!log.tracks) return log;
        const remainingTracks = log.tracks.filter(t => !selectedIds.has(t.id || t.uri));
        return {
          ...log,
          tracks: remainingTracks,
          count: remainingTracks.length,
          uris: remainingTracks.map(track => track.uri)
        };
      }).filter(log => log.count > 0);
      
      setDeletedLog(newLog);
      localStorage.setItem('songnull_deleted_log', JSON.stringify(newLog));
      
      setTracks(prev => prev.filter(t => !selectedIds.has(t.id || t.uri)));
      setSelectedIds(new Set());
      
      alert('Tracks restored successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to restore tracks. Check console.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden', background: 'var(--color-bg-base)' }}>
      {/* Background Effect */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <LightTunnel 
          cableColor="#1db954"
          pulseColor="#1ed760"
          tunnelColor="#000000"
          tunnelOpacity={0.8}
          speed={0.05}
          glow={0.5}
          size={1.2}
          opacity={0.3}
          mouseInteraction={true}
        />
      </div>

      {/* Sidebar */}
      <div style={{ 
        width: '280px', 
        flexShrink: 0, 
        zIndex: 10,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: 'var(--space-6) var(--space-4)' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Music size={24} /> SongNull
          </h1>
          {profile && <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{profile.display_name}</p>}
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', paddingLeft: '20px' }}>
          {playlists !== null && (
            <OptionWheel
              items={['💖 Liked Songs', ...playlists.map(p => p.name || 'Unnamed')]}
              defaultSelected={0}
              textColor="rgba(255,255,255,0.3)"
              activeColor="#1db954"
              side="left"
              fontSize={1.2}
              spacing={2.5}
              curve={1}
              tilt={6}
              blur={1.5}
              fade={0.3}
              smoothing={200}
              inset={10}
              loop={false}
              draggable={true}
              onChange={(index) => {
                if (index === 0) setActivePlaylist(null);
                else {
                  const p = playlists[index - 1];
                  if (p) setActivePlaylist(p.id);
                }
              }}
            />
          )}
        </div>

        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => {
            if (activePlaylist === 'UNDO_BIN') {
              setActivePlaylist(previousPlaylistRef.current);
            } else {
              setActivePlaylist('UNDO_BIN');
            }
          }} className={`btn ${activePlaylist === 'UNDO_BIN' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', justifyContent: 'center', marginBottom: '8px' }}>
            <History size={16} /> Undo Bin
          </button>
          <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        zIndex: 5,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8))',
        position: 'relative'
      }}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={activePlaylist || 'liked-songs'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'var(--space-6)', overflow: 'hidden', gap: 'var(--space-4)', maxWidth: '1200px', margin: '0 auto', width: '100%' }}
          >
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: '2.5rem', margin: 0, color: 'var(--color-text-primary)' }}>
                {activePlaylist === 'UNDO_BIN' ? 'Undo Bin' : (activePlaylist ? playlists.find(p => p.id === activePlaylist)?.name : 'Liked Songs')}
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', margin: '8px 0 0 0' }}>
                Loaded {tracks.length} {totalTracks ? `of ${totalTracks}` : ''} tracks {hasMore && <Loader2 size={12} className="lucide-spin" style={{display:'inline', animation: 'spin 1s linear infinite'}}/>}
              </p>
            </div>
            
            {/* Action Bar */}
            <div className="glass-panel" style={{ 
              padding: 'var(--space-4)', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--space-4)',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flex: 1, minWidth: '300px' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                  <input 
                    type="text" 
                    placeholder="Filter by song or artist..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 10px 10px 40px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'var(--color-bg-elevated)',
                      color: 'var(--color-text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                {activePlaylist !== 'UNDO_BIN' && (
                  <>
                    <button className="btn btn-secondary" onClick={selectDuplicates} title="Select Duplicates">
                      <Copy size={16} /> Duplicates
                    </button>
                    <button className="btn btn-secondary" onClick={selectDeadTracks} title="Select Dead/Unplayable Tracks">
                      <Ghost size={16} /> Dead Tracks
                    </button>
                  </>
                )}
                <span style={{ fontWeight: 600 }}>{selectedIds.size} selected</span>
                {selectedIds.size > 0 && (
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </button>
                )}
                
                {activePlaylist === 'UNDO_BIN' ? (
                  <button 
                    className="btn btn-primary solid" 
                    onClick={executeBulkRestore}
                    disabled={selectedIds.size === 0 || isRestoring}
                  >
                    {isRestoring ? <Loader2 size={18} className="lucide-spin" /> : <Undo2 size={18} />}
                    Restore
                  </button>
                ) : (
                  <button 
                    className="btn btn-danger solid" 
                    onClick={confirmBulkDelete}
                    disabled={selectedIds.size === 0 || isDeleting}
                  >
                    <Trash2 size={18} />
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Data Grid */}
            <div className="glass-panel" style={{ 
              flex: 1, 
              borderRadius: 'var(--radius-md)', 
              overflowY: 'auto',
              position: 'relative'
            }}>
              {errorMsg ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '1rem', color: 'var(--color-danger)' }}>
                  <p>{errorMsg}</p>
                </div>
              ) : loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '1rem' }}>
                  <Loader2 size={32} style={{ color: 'var(--color-brand)', animation: 'spin 1s linear infinite' }} />
                  <p>Loading library...</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg-highlight)', zIndex: 10 }}>
                    <tr>
                      <th style={{ padding: 'var(--space-3)', width: '50px', cursor: 'pointer' }} onClick={selectAll}>
                        {allFilteredSelected ? <CheckSquare size={20} color="var(--color-brand)" /> : <Square size={20} color="var(--color-text-secondary)" />}
                      </th>
                      <th style={{ padding: 'var(--space-3)' }}>Title</th>
                      <th style={{ padding: 'var(--space-3)' }}>Artist</th>
                      <th style={{ padding: 'var(--space-3)' }}>Album</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTracks.map(track => {
                      const trackId = track.id || track.uri;
                      return (
                      <tr 
                        key={trackId} 
                        onClick={() => toggleSelection(trackId)}
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.05)', 
                          cursor: 'pointer',
                          background: selectedIds.has(trackId) ? 'rgba(30, 215, 96, 0.1)' : 'transparent',
                          transition: 'background var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = selectedIds.has(trackId) ? 'rgba(30, 215, 96, 0.2)' : 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = selectedIds.has(trackId) ? 'rgba(30, 215, 96, 0.1)' : 'transparent'}
                      >
                        <td style={{ padding: 'var(--space-3)' }}>
                          {selectedIds.has(trackId) ? <CheckSquare size={20} color="var(--color-brand)" /> : <Square size={20} color="var(--color-text-secondary)" />}
                        </td>
                        <td style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          {track.album?.images?.[2] && (
                            <img src={track.album.images[2].url} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px' }} />
                          )}
                          <span style={{ fontWeight: 500, color: selectedIds.has(trackId) ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>{track.name}</span>
                        </td>
                        <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                          {track.artists?.map(a => a.name).join(', ')}
                        </td>
                        <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                          {track.album?.name}
                        </td>
                      </tr>
                    )})}
                    {filteredTracks.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-secondary)' }}>
                          No tracks found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={executeBulkDelete}
        trackCount={selectedIds.size}
        isDeleting={isDeleting}
        progressCurrent={progressCurrent}
        progressTotal={progressTotal}
      />
    </div>
  );
}
