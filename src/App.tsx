import React, { useState, useEffect, useRef } from 'react';
import { Heart, Home, Clock, Film, Tv, Monitor, Clapperboard, Search, Play, ChevronLeft, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';

// ===========================================
// DEFINIZIONE DELLE INTERFACCE (Correzione TS)
// ===========================================

interface Episodio {
  titolo_episodio: string;
  url_video: string;
}

interface VideoData {
  is_serie: boolean;
  url_video?: string;
  episodi?: Episodio[];
}

interface Project {
  id_progetto: string;
  url_poster_verticale: string;
  titolo: string;
  generi: string[];
  attori: string[];
  descrizione: string;
  macro_categoria: string;
  sub_categoria: string;
  video_data: VideoData;
}

interface HistoryItem {
  projectId: string;
  episodeIndex: number;
  timestamp: number;
}

// ===========================================
// INIZIO DEL COMPONENTE PRINCIPALE
// ===========================================

const MyDramaApp = () => {
  const [loading, setLoading] = useState(true);
  const [showApp, setShowApp] = useState(false);
  // TIPIZZAZIONE CORRETTA DELLE VARIABILI DI STATO:
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentPage, setCurrentPage] = useState<string>('home'); // Tipizzato come stringa
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [playing, setPlaying] = useState<Project | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [focusedMenu, setFocusedMenu] = useState(0);
  
  // CORREZIONE DEFINITIVA PER videoRef (che causava l'errore 'never'):
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const preloaderVideoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colors = {
    primary: '#FF1493',
    secondary: '#8B008B',
    background: '#0a0a0a',
    cardBg: '#1a1a1a'
  };

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'history', label: 'Continua a guardare', icon: Clock },
    { id: 'favorites', label: 'Preferiti', icon: Heart },
    { id: 'film', label: 'Film', icon: Film },
    { id: 'drama', label: 'Drama', icon: Tv },
    { id: 'mini', label: 'Mini e Web Drama', icon: Monitor },
    { id: 'altro', label: 'Altro', icon: Clapperboard },
    { id: 'search', label: 'Cerca', icon: Search }
  ];

  useEffect(() => {
    // Tipizzazione dell'evento da tastiera (KeyboardEvent)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || playing) return;

      const filteredProjects = getFilteredProjects();
      const totalItems = filteredProjects.length;

      switch(e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (selectedProject) {
            return;
          }
 
          setFocusedMenu(prev => Math.max(0, prev - 1));
          break;
        
        case 'ArrowDown':
          e.preventDefault();
          if (selectedProject) {
            return;
          }
          setFocusedMenu(prev => Math.min(menuItems.length - 1, 
 prev + 1));
          break;
        
        case 'ArrowLeft':
          e.preventDefault();
          if (selectedProject) {
            return;
          }
          setFocusedIndex(prev => Math.max(0, prev - 1));
          break;
  
       
        case 'ArrowRight':
          e.preventDefault();
          if (selectedProject) {
            return;
          }
          setFocusedIndex(prev => Math.min(totalItems - 1, prev + 1));
 break;
        
        case 'Enter':
          e.preventDefault();
 if (selectedProject) {
            return;
 }
          // Correzione TS18047: 'document.activeElement' è nullabile.
          // In questo blocco stiamo passando al menu, non al progetto.
          if (document.activeElement && document.activeElement.tagName !== 'INPUT') {
            const item = menuItems[focusedMenu];
 if (item) {
              setCurrentPage(item.id);
              setSelectedCategory(null);
              setSearchQuery('');
              setFocusedIndex(0);
 }
          }
          break;
 case 'Escape':
        case 'Backspace':
          e.preventDefault();
 if (selectedProject) {
            setSelectedProject(null);
 } else if (currentPage !== 'home') {
            setCurrentPage('home');
 }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, playing, selectedProject, focusedMenu, focusedIndex, currentPage]);

  useEffect(() => {
    loadProjects();
    loadFavorites();
    loadHistory();
    
    // Attende per mostrare l'app dopo il preloader
    setTimeout(() => {
      setShowApp(true);
    }, 500);
  }, []);

  useEffect(() => {
    // 'video' viene correttamente tipizzato grazie alla useRef sopra.
    if (videoRef.current && playing) {
      const video = videoRef.current;
      
      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        const timeLeft = video.duration - video.currentTime;
        
        // La proprietà video_data esiste grazie alla tipizzazione di `playing`
        if (timeLeft <= 20 && timeLeft > 0) {
          const episodes = playing.video_data.episodi;
          if (episodes && currentEpisode < episodes.length - 1) {
  
           setShowNextButton(true);
          }
        }
      };
      const handleLoadedMetadata = () => {
        setDuration(video.duration);
      };
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', 
 handleLoadedMetadata);
      };
    }
  }, [playing, currentEpisode]);

  useEffect(() => {
    if (playing && showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, playing]);

  const handleMouseMove = () => {
    setShowControls(true);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
 } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
 }
  };

  // Tipizzazione corretta dell'evento
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = pos * duration;
 }
  };

  // Tipizzazione corretta del parametro
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const loadProjects = async () => {
  console.log('Inizio caricamento progetti...');
  try {
    const response = await fetch('https://raw.githubusercontent.com/mydramasubita-boop/listaprogettimydramafansub/refs/heads/main/metadati_fansub_test.json');
    console.log('Response ricevuta:', response.status);
    const data = await response.json();
    console.log('Dati parsati:', data.length, 'progetti');
    setProjects(data);
  } catch (error) {
    console.error('Errore caricamento:', error);
  }
};

  const loadFavorites = () => {
    const saved = localStorage.getItem('mydrama_favorites');
 if (saved) {
      try {
        // Tipizzazione di favorites come string[]
        setFavorites(JSON.parse(saved) as string[]);
 } catch (e) {
        setFavorites([]);
      }
    }
  };

  const loadHistory = () => {
    const saved = localStorage.getItem('mydrama_history');
 if (saved) {
      try {
        // Tipizzazione di history come HistoryItem[]
        setHistory(JSON.parse(saved) as HistoryItem[]);
 } catch (e) {
        setHistory([]);
      }
    }
  };
  
  // Tipizzazione corretta di projectId
  const toggleFavorite = (projectId: string) => {
    const newFavorites = favorites.includes(projectId)
      ?
 favorites.filter(id => id !== projectId)
      : [...favorites, projectId];
    setFavorites(newFavorites);
    localStorage.setItem('mydrama_favorites', JSON.stringify(newFavorites));
  };
  
  // Tipizzazione corretta del parametro project
  const addToHistory = (project: Project, episodeIndex = 0) => {
    const newHistory = [
      // L'id_progetto viene ora trattato come stringa
      { projectId: project.id_progetto, episodeIndex, timestamp: Date.now() },
      ...history.filter(h => h.projectId !== project.id_progetto)
    ].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('mydrama_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.setItem('mydrama_history', JSON.stringify([]));
  };
  
  // Tipizzazione corretta del parametro projectId
  const removeFromHistory = (projectId: string) => {
    const newHistory = history.filter(h => h.projectId !== projectId);
    setHistory(newHistory);
    localStorage.setItem('mydrama_history', JSON.stringify(newHistory));
 };

  const playVideo = (project: Project, episodeIndex = 0) => {
    setPlaying(project);
    setCurrentEpisode(episodeIndex);
    addToHistory(project, episodeIndex);
    setShowNextButton(false);
  };

  const nextEpisode = () => {
    // La tipizzazione di playing risolve gli errori di accesso a video_data e episodi
    if (playing && playing.video_data.episodi && currentEpisode < playing.video_data.episodi.length - 1) {
      setCurrentEpisode(currentEpisode + 1);
      setShowNextButton(false);
      addToHistory(playing, currentEpisode + 1);
    }
  };

  const prevEpisode = () => {
    if (playing && currentEpisode > 0) { // Aggiunto check 'playing'
      setCurrentEpisode(currentEpisode - 1);
      setShowNextButton(false);
      addToHistory(playing, currentEpisode - 1);
    }
  };

  const getFilteredProjects = (): Project[] => { // Tipo di ritorno esplicito
    let filtered = projects;
    // L'array latestByCategory è ora esplicitamente tipizzato come Project[]
    if (currentPage === 'home') {
      // Mostra ultimi 6 progetti per ogni macrocategoria
      const categories = ['film', 'drama', 'mini e web drama', 'altro'];
      // Variabile `latestByCategory` è ora tipizzata
      const latestByCategory: Project[] = []; 
      
      categories.forEach(cat => {
        const categoryProjects = projects
          .filter(p => p.macro_categoria === cat)
          .slice(0, 6); // Primi 6 = più recenti
        latestByCategory.push(...categoryProjects);
      });
      return latestByCategory;
    } else if (currentPage === 'favorites') {
      // favorites è tipizzato come string[], id_progetto come stringa
      filtered = filtered.filter(p => favorites.includes(p.id_progetto));
    } else if (currentPage === 'history') {
      // history è tipizzato come HistoryItem[]
      const historyIds = history.map(h => h.projectId);
      // CORREZIONE: Mappa i progetti in base alla cronologia, non solo filtra
      filtered = history.map(h => projects.find(p => p.id_progetto === h.projectId)).filter((p): p is Project => p !== undefined);
    } else if (currentPage === 'film') {
      filtered = filtered.filter(p => p.macro_categoria === 'film');
    } else if (currentPage === 'drama') {
      filtered = filtered.filter(p => p.macro_categoria === 'drama');
    } else if (currentPage === 'mini') {
      filtered = filtered.filter(p => p.macro_categoria === 'mini e web drama');
    } else if (currentPage === 'altro') {
      filtered = filtered.filter(p => p.macro_categoria === 'altro');
    }

    if (selectedCategory) {
      filtered = filtered.filter(p => p.sub_categoria === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.titolo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        // Tipizzazione in linea (g e a sono stringhe)
        p.generi.some((g: string) => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.attori.some((a: string) => a.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  };

  const getAllSubCategories = () => {
    const subCategoriesByMacro: { [key: string]: string[] } = { // Tipizzazione esplicita
      'film': ['Cina', 'Corea', 'Giappone', 'Hong Kong', 'Taiwan', 'Thailandia'],
      'drama': ['Cina', 'Corea', 'Giappone', 'Hong Kong', 'Taiwan', 'Thailandia'],
      'mini e web drama': ['Cina', 'Corea', 'Giappone', 'Hong Kong', 'Taiwan', 'Thailandia'],
      'altro': ['Cortometraggi', 'Teaser Trailer', 'Pubblicità']
    };
    if (currentPage === 'film') return subCategoriesByMacro['film'];
    if (currentPage === 'drama') return subCategoriesByMacro['drama'];
    if (currentPage === 'mini') return subCategoriesByMacro['mini e web drama'];
    if (currentPage === 'altro') return subCategoriesByMacro['altro'];
    
    return [];
  };

  const getSubCategories = () => {
    return getAllSubCategories();
  };

  // ===========================================
  // RENDERIZZAZIONE
  // ===========================================
  
  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <video
          ref={preloaderVideoRef}
          autoPlay
       
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          // Tipizzazione dell'evento video (React.SyntheticEvent<HTMLVideoElement>)
          onTimeUpdate={(e: React.SyntheticEvent<HTMLVideoElement>) => {
            const video = e.target as HTMLVideoElement; // Casting per l'elemento video
 
            const timeLeft = video.duration - video.currentTime;
            if (timeLeft <= 0.75 && timeLeft > 0) {
              // La proprietà video.style esiste su HTMLVideoElement
              video.style.opacity = (timeLeft / 0.75).toString(); 
            }
          }}
          onEnded={() => setLoading(false)}
          onError={() => 
 setLoading(false)}
        >
          <source src="https://wh1373514.ispot.cc/wp/wp-content/MY%20DRAMA%20TV/FILEAPP/PRELOADER.mp4" type="video/mp4" />
        </video>
      </div>
    );
 }

  if (playing) {
    // La tipizzazione di 'playing' come Project | null garantisce che video_data esista qui.
    const videoUrl = playing.video_data.is_serie
      ?
 playing.video_data.episodi![currentEpisode].url_video // Usiamo ! per asserire che esiste
      : playing.video_data.url_video;

    return (
      <div 
        style={{
          width: '100%',
          height: '100vh',
          background: '#000',
          position: 'relative'
        }}
        onMouseMove={handleMouseMove}
        onClick={() => setShowControls(true)}
      
 >
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          muted={muted}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onClick={togglePlayPause}
        />
        
        <div 
 style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: showControls ? 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.7) 100%)' : 'transparent',
          pointerEvents: showControls ? 'auto' : 'none',
      
          transition: 'background 0.3s ease',
          opacity: showControls ? 1 : 0
        }}>
          {/* Controlli superiori */}
          <div style={{
            position: 'absolute',
            top: '30px',
            left: '40px',
       
             right: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'all'
          }}>
            <button
              onClick={() => { setPlaying(null);
 setShowNextButton(false); setIsPlaying(true); }}
              style={{
                padding: '18px 35px',
                background: 'rgba(0,0,0,0.8)',
                border: `2px solid ${colors.primary}`,
                borderRadius: '12px',
             
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '20px',
                cursor: 'pointer',
           
                fontWeight: 'bold'
              }}
            >
              <ChevronLeft size={24} /> Indietro
            </button>

            {playing.video_data.is_serie && playing.video_data.episodi && (
              <div style={{
          
                background: 'rgba(0,0,0,0.8)',
                padding: '15px 30px',
                borderRadius: '12px',
                fontSize: '20px',
                fontWeight: 'bold'
              }}>
          
                {playing.video_data.episodi[currentEpisode].titolo_episodio}
              </div>
            )}

            <button
              onClick={() => {
                setMuted(!muted);
 if (videoRef.current) {
                  // La proprietà muted esiste grazie alla tipizzazione di videoRef
                  videoRef.current.muted = !muted;
 }
              }}
              style={{
                padding: '18px',
                background: 'rgba(0,0,0,0.8)',
                border: `2px solid ${colors.primary}`,
                borderRadius: '12px',
  
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {muted ?
 <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          </div>

          {/* Controlli centrali - Play/Pause */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
       
             transform: 'translate(-50%, -50%)',
            pointerEvents: 'all'
          }}>
            <button
              onClick={togglePlayPause}
              style={{
                width: '80px',
             
                height: '80px',
                background: 'rgba(0,0,0,0.6)',
                border: `3px solid ${colors.primary}`,
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
         
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isPlaying && showControls ?
 0.7 : 1,
                transition: 'opacity 0.3s'
              }}
            >
              {isPlaying ?
 (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ width: '8px', height: '32px', background: 'white', borderRadius: '2px' }} />
                  <div style={{ width: '8px', height: '32px', background: 'white', borderRadius: '2px' }} />
                </div>
    
           ) : (
                <Play size={36} fill="white" style={{ marginLeft: '4px' }} />
              )}
            </button>
          </div>

          {/* Controlli inferiori - Barra di scorrimento e episodi */}
          
 <div style={{
            position: 'absolute',
            bottom: '30px',
            left: '40px',
            right: '40px',
            pointerEvents: 'all'
          }}>
            {/* Barra di scorrimento */}
        
          <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '60px' }}>
                  {formatTime(currentTime)}
                </span>
          
              <div
                  onClick={handleSeek}
                  style={{
                    flex: 1,
                    height: '8px',
                
                    background: 'rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
              
           >
                  <div style={{
                    width: `${(currentTime / duration) * 100}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
          
                    borderRadius: '4px',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
      
                      right: '-6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '16px',
              
                      height: '16px',
                      background: 'white',
                      borderRadius: '50%',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                   
                   }} />
                  </div>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '60px' }}>
                  {formatTime(duration)}
                </span>
      
              </div>
            </div>

            {/* Controlli episodi per serie TV */}
            {playing.video_data.is_serie && playing.video_data.episodi && (
              <div style={{
                display: 'flex',
                
 gap: '20px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                {currentEpisode > 0 && (
                  <button
             
                        onClick={prevEpisode}
                    style={{
                      padding: '18px 35px',
                      background: 'rgba(0,0,0,0.8)',
                      border: `2px solid ${colors.primary}`,
 
                      borderRadius: '12px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
         
                      gap: '12px',
                      fontSize: '18px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                 
                    }}
                  >
                    <SkipBack size={20} /> Precedente
                  </button>
                )}

                {currentEpisode < playing.video_data.episodi.length - 1 && 
 (
                  <button
                    onClick={nextEpisode}
                    style={{
                      padding: '18px 35px',
                  
                      background: 'rgba(0,0,0,0.8)',
                      border: `2px solid ${colors.primary}`,
                      borderRadius: '12px',
                      color: 'white',
                      display: 'flex',
 
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '18px',
                      cursor: 'pointer',
         
                      fontWeight: 'bold'
                    }}
                  >
                    Successivo <SkipForward size={20} />
                  </button>
       
           )}
              </div>
            )}
          </div>

          {/* Pulsante "Vai all'episodio successivo" a 20 secondi dalla fine */}
          {showNextButton && playing.video_data.is_serie && playing.video_data.episodi && currentEpisode < playing.video_data.episodi.length - 1 && (
            <div style={{
  
              position: 'absolute',
              bottom: '140px',
              right: '40px',
              pointerEvents: 'all'
            }}>
              <button
                
 onClick={nextEpisode}
                style={{
                  padding: '20px 40px',
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  border: 'none',
                  borderRadius: '12px',
     
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  fontSize: '20px',
          
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  animation: 'pulse 1.5s infinite',
                  boxShadow: `0 0 30px ${colors.primary}`
                }}
             
                 >
                Vai all'episodio successivo <SkipForward size={24} />
              </button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% 
 { transform: scale(1); }
            50% { transform: scale(1.05);
 }
          }
        `}</style>
      </div>
    );
 }

  if (selectedProject) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100vh',
        background: `url(https://wh1373514.ispot.cc/wp/wp-content/MY%20DRAMA%20TV/FILEAPP/background.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        color: 'white',
        position: 'relative',
        overflowY: 'auto'
   
     }}>
        <div style={{ position: 'relative', zIndex: 2, padding: '60px' }}>
          <button
            onClick={() => setSelectedProject(null)}
            style={{
              padding: '25px 45px',
              background: 'rgba(0,0,0,0.95)',
              
 border: `3px solid ${colors.primary}`,
              borderRadius: '15px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              fontSize: '26px',
       
              cursor: 'pointer',
              marginBottom: '50px',
              fontWeight: 'bold'
            }}
          >
            <ChevronLeft size={32} /> Indietro
          </button>

          <div style={{ display: 'flex', gap: 
 '60px', marginBottom: '60px', flexWrap: 'wrap' }}>
            <img
              src={selectedProject.url_poster_verticale}
              alt={selectedProject.titolo}
              style={{
                width: '400px',
                height: '600px',
       
                objectFit: 'cover',
                borderRadius: '20px',
                boxShadow: `0 30px 80px rgba(255,20,147,0.5)`
              }}
            />

            <div style={{ flex: 1, minWidth: '400px' }}>
         
              <h1 style={{ fontSize: '64px', marginBottom: '30px', lineHeight: '1.2', textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}>
                {selectedProject.titolo}
              </h1>
              
              <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
              
             {selectedProject.generi.map((genere: string, i: number) => ( // Tipizzazione corretta in linea
                  <span
                    key={i}
                    onClick={() => {
                      setSearchQuery(genere);
                      setCurrentPage('search');
                      setSelectedProject(null);
                    }}
                    style={{
                      padding: '15px 30px',
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      borderRadius: '30px',
      
                      fontSize: '20px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
           
                    }}
                  >
                    {genere}
                  </span>
                ))}
              </div>

     
              <p style={{ fontSize: '24px', lineHeight: '1.8', marginBottom: '40px', textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>
                {selectedProject.descrizione}
              </p>

              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '28px', marginBottom: '20px', opacity: 0.9 }}>Cast:</h3>
      
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {selectedProject.attori.map((attore: string, i: number) => ( // Tipizzazione corretta in linea
                    <span
                      key={i}
                   
                      onClick={() => {
                        setSearchQuery(attore);
                        setCurrentPage('search');
                        setSelectedProject(null);
                      }}
                      style={{
                        padding: '12px 25px',
                        background: 'rgba(255,20,147,0.9)',
                        borderRadius: 
 '10px',
                        fontSize: '18px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: 
 '0 4px 15px rgba(0,0,0,0.3)'
                      }}
                    >
                      {attore}
                    </span>
             
               ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '25px', marginTop: '40px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => toggleFavorite(selectedProject.id_progetto)}
     
                  style={{
                    padding: '22px 45px',
                    background: favorites.includes(selectedProject.id_progetto) 
                      ?
 `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                      : 'rgba(255,255,255,0.15)',
                    border: `3px solid ${colors.primary}`,
                    borderRadius: '15px',
                    color: 'white',
          
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    fontSize: '22px',
                    cursor: 'pointer',
     
                    fontWeight: 'bold'
                  }}
                >
                  <Heart size={28} fill={favorites.includes(selectedProject.id_progetto) ?
 'white' : 'none'} />
                  {favorites.includes(selectedProject.id_progetto) ?
 'Rimuovi' : 'Aggiungi'}
                </button>

                {!selectedProject.video_data.is_serie && (
                  <button
                    onClick={() => playVideo(selectedProject)}
                    style={{
    
                      padding: '28px 65px',
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      border: 'none',
                      borderRadius: '15px',
         
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                 
                      fontSize: '30px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      boxShadow: `0 15px 50px rgba(255,20,147,0.6)`
                    }}
  
                 >
                    <Play size={36} fill="white" /> GUARDA
                  </button>
                )}
              </div>
            
 </div>
          </div>

          {selectedProject.video_data.is_serie && selectedProject.video_data.episodi && (
            <div>
              <h2 style={{ fontSize: '44px', marginBottom: '35px', textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}>Episodi</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '30px' }}>
                {selectedProject.video_data.episodi.map((ep: Episodio, 
 i: number) => ( // Tipizzazione corretta in linea
                  <button
                    key={i}
                    onClick={() => playVideo(selectedProject, i)}
                    style={{
                 
                      padding: '30px',
                      background: 'rgba(26,26,26,0.95)',
                      border: `3px solid ${colors.primary}`,
                      borderRadius: '15px',
                      color: 
 'white',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
        
                      gap: '25px',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s'
               
                    }}
                  >
                    <div style={{
                      width: '60px',
                      height: '60px',
          
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Play size={32} fill="white" />
                    </div>
     
                       <span>{ep.titolo_episodio}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
 
     );
  }

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: `url(https://wh1373514.ispot.cc/wp/wp-content/MY%20DRAMA%20TV/FILEAPP/background.png)`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      color: 'white',
      opacity: showApp ? 1 : 0,
      transition: 'opacity 0.5s ease-in'
    }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
   
            <header style={{
          padding: '20px 60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: `4px solid ${colors.primary}`,
          flexWrap: 'wrap',
   
            gap: '30px'
        }}>
          <img 
            src="https://wh1373514.ispot.cc/wp/wp-content/MY%20DRAMA%20TV/FILEAPP/logo.svg"
            alt="My Drama Life"
            style={{ height: '80px', width: 'auto' }}
          />

          <nav style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
  
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isFocused = focusedMenu === index;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setSelectedCategory(null);
     
                    setSearchQuery('');
                    setFocusedIndex(0);
                  }}
                  style={{
                    padding: '12px 16px',
       
                    background: isActive 
                      ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` 
                      : 'transparent',
                    border: 'none',
               
                    outline: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
          
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transform: isFocused ? 'scale(1.05)' : 'scale(1)',
 
                    transition: 'all 0.2s',
                    minWidth: '80px',
                    boxShadow: 'none'
                  }}
                >
   
                <Icon size={28} />
                  <span style={{ fontSize: '13px', textAlign: 'center' }}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        <main style={{ padding: '40px 60px' }}>
          {currentPage === 'home' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
            
              justifyContent: 'center',
              minHeight: '80px',
              marginBottom: '20px'
            }}>
              <h1 style={{ fontSize: '38px', textShadow: '0 4px 20px rgba(0,0,0,0.9)', margin: 0 }}>
                Ultime uscite
             
              </h1>
            </div>
          )}

          {(currentPage === 'favorites' || (currentPage === 'history' && history.length === 0)) && (
            <div style={{
              minHeight: '80px',
              marginBottom: '20px'
            
 }} />
          )}

          {currentPage === 'search' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80px',
  
              marginBottom: '20px'
            }}>
              <input
                type="text"
                placeholder="Cerca per titolo, genere o attore..."
                value={searchQuery}
        
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} // Tipizzazione corretta
                style={{
                  width: '100%',
                  maxWidth: '800px',
                  padding: '25px',
                 
                  fontSize: '24px',
                  background: 'rgba(26,26,26,0.9)',
                  border: `3px solid ${colors.primary}`,
                  borderRadius: '15px',
                  color: 'white',
                  outline: 'none'
 
                }}
              />
            </div>
          )}

          {currentPage === 'history' && history.length > 0 && (
            <div style={{
              display: 'flex',
   
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80px',
              marginBottom: '20px'
            }}>
              <button
                onClick={clearHistory}
 
                style={{
                  padding: '12px 24px',
                  background: colors.primary,
                  border: 'none',
                  borderRadius: '10px',
        
                  color: 'white',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
  
                Cancella Cronologia
              </button>
            </div>
          )}

          {['film', 'drama', 'mini', 'altro'].includes(currentPage) && (
            <div style={{
              display: 'flex',
      
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          
              <button
                  onClick={() => setSelectedCategory(null)}
                  style={{
                    padding: '12px 24px',
                    background: !selectedCategory ?
 colors.primary : 'rgba(26,26,26,0.9)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '16px',
              
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Tutte
                </button>
    
                {getSubCategories().map((cat: string) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
      
                      padding: '12px 24px',
                      background: selectedCategory === cat ? colors.primary : 'rgba(26,26,26,0.9)',
                      border: 'none',
                      borderRadius: '10px',
       
                      color: 'white',
                      fontSize: '16px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
               
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
         
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '35px'
          }}>
            {getFilteredProjects().map((project: Project, index: number) => { // Tipizzazione Project[] corretta
          
              const isFocused = focusedIndex === index;
              // La proprietà generi esiste grazie alla tipizzazione di `project`
              const isOnAir = project.generi.some(g => g.toLowerCase() === 'onair' || g.toLowerCase() === 'on air');
              return (
                <div
                  key={project.id_progetto}
                  style={{
                    background: 'rgba(26,26,26,0.9)',
                    borderRadius: '15px',
     
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    transform: isFocused ? 'scale(1.1)' : 'scale(1)',
                
                    boxShadow: isFocused ? `0 0 30px ${colors.primary}` : 'none',
                    border: `3px solid ${isFocused ? colors.primary : 'transparent'}`
                  }}
                  onClick={() => setSelectedProject(project)}
                >
       
                  <div style={{ position: 'relative' }}>
                    <img
                      src={project.url_poster_verticale}
                      alt={project.titolo}
                     
                      style={{
                        width: '100%',
                        height: '375px',
                        objectFit: 'cover'
                      }}
  
                    />
                    
                    <button
                      onClick={(e) => {
                  
                        e.stopPropagation();
                        toggleFavorite(project.id_progetto);
                      }}
                      style={{
                        position: 'absolute',
                        top: '15px',
                    
                        left: '15px',
                        background: 'rgba(0,0,0,0.8)',
                        border: 'none',
                        borderRadius: '50%',
                    
                        width: '50px',
                        height: '50px',
                        display: 'flex',
                        alignItems: 'center',
                    
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 2
                      }}
                    >
   
                       <Heart
                        size={24}
                        fill={favorites.includes(project.id_progetto) ?
 colors.primary : 'none'}
                        color={favorites.includes(project.id_progetto) ?
 colors.primary : 'white'}
                      />
                    </button>
                  </div>

                  <div style={{ padding: '20px' }}>
                
                    <h3 style={{ fontSize: '20px', marginBottom: '12px', lineHeight: '1.3' }}>
                      {project.titolo}
                    </h3>
                    <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '8px' }}>
                  
                      {project.macro_categoria} • {project.sub_categoria}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontSize: '14px', opacity: 0.7, flex: 1 }}>
              
                        {project.generi.filter((g: string) => g.toLowerCase() !== 'onair' && g.toLowerCase() !== 'on air').slice(0, 2).join(', ')}
                        {project.generi.filter((g: string) => g.toLowerCase() !== 'onair' && g.toLowerCase() !== 'on air').length > 2 && '...'}
                      </div>
                    
                    {isOnAir && (
                        <div style={{
                          color: '#FF0000',
                          fontWeight: 'bold',
                 
                          fontSize: '16px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}>
            
                          ONAIR
                        </div>
                      )}
                    </div>
                  </div>
  
                </div>
              );
            })}
          </div>

          {getFilteredProjects().length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              display: 'flex',
              flexDirection: 'column',
  
              alignItems: 'center',
              gap: '30px'
            }}>
              <img 
                src="https://wh1373514.ispot.cc/wp/wp-content/MY%20DRAMA%20TV/FILEAPP/No_Found_loop.gif"
                alt="Nessun contenuto"
            
                style={{
                  width: '300px',
                  height: 'auto',
                  borderRadius: '15px'
                }}
              />
         
              <p style={{ fontSize: '28px', fontWeight: 'bold', opacity: 0.8 }}>
                Ci dispiace, non c'è nulla da vedere qui
              </p>
            </div>
          )}
        </main>

        <footer style={{
          padding: 
 '50px',
          textAlign: 'center',
          borderTop: '2px solid rgba(255,255,255,0.1)',
          marginTop: '80px',
          background: 'rgba(0,0,0,0.5)'
        }}>
          <p style={{ opacity: 0.6, fontSize: '18px' }}>
            My Drama Life TV © 2025 all right reserved - Created by gswebagency.net
      
           </p>
        </footer>
      </div>
    </div>
  );
};

export default MyDramaApp;
