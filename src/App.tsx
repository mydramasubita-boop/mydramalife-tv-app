import React, { useState, useEffect, useRef } from 'react';
import { Heart, Home, Clock, Film, Tv, Monitor, Clapperboard, Search, Play, ChevronLeft, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';

const lockOrientation = () => {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
};

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

const MyDramaApp = () => {
  const [loading, setLoading] = useState(true);
  const [showApp, setShowApp] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentPage, setCurrentPage] = useState<string>('home');
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
  const [focusZone, setFocusZone] = useState<'menu' | 'content'>('menu');
  const [focusedCardIndex, setFocusedCardIndex] = useState(0);
  const [focusedMenu, setFocusedMenu] = useState(0);
  const [detailFocusZone, setDetailFocusZone] = useState<'back' | 'genres' | 'actors' | 'buttons' | 'episodes'>('buttons');
  const [detailSubIndex, setDetailSubIndex] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const preloaderVideoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterPressStartRef = useRef<number | null>(null);

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

  const getCardsPerRow = () => {
    const containerWidth = window.innerWidth - 120;
    const cardWidth = 250 + 35;
    return Math.floor(containerWidth / cardWidth) || 1;
  };

  useEffect(() => {
    lockOrientation();
    window.addEventListener('load', lockOrientation);
    document.addEventListener('fullscreenchange', lockOrientation);
    return () => {
      window.removeEventListener('load', lockOrientation);
      document.removeEventListener('fullscreenchange', lockOrientation);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || playing) return;

      const filteredProjects = getFilteredProjects();
      const totalCards = filteredProjects.length;

      if (selectedProject) {
        const genresCount = selectedProject.generi.length;
        const actorsCount = selectedProject.attori.length;
        const hasButtons = !selectedProject.video_data.is_serie ? 2 : 1;
        const episodesCount = selectedProject.video_data.is_serie && selectedProject.video_data.episodi ? selectedProject.video_data.episodi.length : 0;
        
        switch(e.key) {
          case 'ArrowUp':
            e.preventDefault();
            if (detailFocusZone === 'episodes') {
              if (detailSubIndex === 0) {
                setDetailFocusZone('buttons');
                setDetailSubIndex(0);
              } else {
                setDetailSubIndex(prev => prev - 1);
              }
            } else if (detailFocusZone === 'buttons') {
              setDetailFocusZone('actors');
              setDetailSubIndex(0);
            } else if (detailFocusZone === 'actors') {
              setDetailFocusZone('genres');
              setDetailSubIndex(0);
            } else if (detailFocusZone === 'genres') {
              setDetailFocusZone('back');
              setDetailSubIndex(0);
            }
            break;
          
          case 'ArrowDown':
            e.preventDefault();
            if (detailFocusZone === 'back') {
              setDetailFocusZone('genres');
              setDetailSubIndex(0);
            } else if (detailFocusZone === 'genres') {
              setDetailFocusZone('actors');
              setDetailSubIndex(0);
            } else if (detailFocusZone === 'actors') {
              setDetailFocusZone('buttons');
              setDetailSubIndex(0);
            } else if (detailFocusZone === 'buttons' && episodesCount > 0) {
              setDetailFocusZone('episodes');
              setDetailSubIndex(0);
            } else if (detailFocusZone === 'episodes') {
              setDetailSubIndex(prev => Math.min(episodesCount - 1, prev + 1));
            }
            break;
          
          case 'ArrowLeft':
            e.preventDefault();
            if (detailFocusZone === 'genres') {
              setDetailSubIndex(prev => Math.max(0, prev - 1));
            } else if (detailFocusZone === 'actors') {
              setDetailSubIndex(prev => Math.max(0, prev - 1));
            } else if (detailFocusZone === 'buttons') {
              setDetailSubIndex(prev => Math.max(0, prev - 1));
            }
            break;
          
          case 'ArrowRight':
            e.preventDefault();
            if (detailFocusZone === 'genres') {
              setDetailSubIndex(prev => Math.min(genresCount - 1, prev + 1));
            } else if (detailFocusZone === 'actors') {
              setDetailSubIndex(prev => Math.min(actorsCount - 1, prev + 1));
            } else if (detailFocusZone === 'buttons') {
              setDetailSubIndex(prev => Math.min(hasButtons - 1, prev + 1));
            }
            break;
          
          case 'Enter':
            e.preventDefault();
            if (detailFocusZone === 'back') {
              setSelectedProject(null);
              setDetailFocusZone('buttons');
              setDetailSubIndex(0);
              setFocusZone('content');
            } else if (detailFocusZone === 'genres') {
              const genre = selectedProject.generi[detailSubIndex];
              setSearchQuery(genre);
              setCurrentPage('search');
              setSelectedProject(null);
              setDetailFocusZone('buttons');
              setDetailSubIndex(0);
            } else if (detailFocusZone === 'actors') {
              const actor = selectedProject.attori[detailSubIndex];
              setSearchQuery(actor);
              setCurrentPage('search');
              setSelectedProject(null);
              setDetailFocusZone('buttons');
              setDetailSubIndex(0);
            } else if (detailFocusZone === 'buttons') {
              if (detailSubIndex === 0) {
                toggleFavorite(selectedProject.id_progetto);
              } else if (detailSubIndex === 1 && !selectedProject.video_data.is_serie) {
                playVideo(selectedProject);
              }
            } else if (detailFocusZone === 'episodes') {
              playVideo(selectedProject, detailSubIndex);
            }
            break;
          
          case 'Escape':
          case 'Backspace':
            e.preventDefault();
            setSelectedProject(null);
            setDetailFocusZone('buttons');
            setDetailSubIndex(0);
            setFocusZone('content');
            break;
        }
        return;
      }

      if (e.key === 'Enter') {
        if (focusZone === 'content' && !enterPressStartRef.current) {
          enterPressStartRef.current = Date.now();
        }
      }

      const cardsPerRow = getCardsPerRow();

      switch(e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (focusZone === 'content') {
            if (focusedCardIndex < cardsPerRow) {
              setFocusZone('menu');
            } else {
              setFocusedCardIndex(prev => Math.max(0, prev - cardsPerRow));
            }
          }
          break;
        
        case 'ArrowDown':
          e.preventDefault();
          if (focusZone === 'menu') {
            setFocusZone('content');
            setFocusedCardIndex(0);
          } else if (focusZone === 'content') {
            setFocusedCardIndex(prev => Math.min(totalCards - 1, prev + cardsPerRow));
          }
          break;
        
        case 'ArrowLeft':
          e.preventDefault();
          if (focusZone === 'menu') {
            setFocusedMenu(prev => Math.max(0, prev - 1));
          } else if (focusZone === 'content') {
            setFocusedCardIndex(prev => Math.max(0, prev - 1));
          }
          break;
        
        case 'ArrowRight':
          e.preventDefault();
          if (focusZone === 'menu') {
            setFocusedMenu(prev => Math.min(menuItems.length - 1, prev + 1));
          } else if (focusZone === 'content') {
            setFocusedCardIndex(prev => Math.min(totalCards - 1, prev + 1));
          }
          break;

        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          if (focusZone === 'content' && currentPage !== 'home') {
            setCurrentPage('home');
            setFocusZone('menu');
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && enterPressStartRef.current) {
        const pressDuration = Date.now() - enterPressStartRef.current;
        enterPressStartRef.current = null;

        if (pressDuration >= 2000) {
          const filteredProjects = getFilteredProjects();
          const project = filteredProjects[focusedCardIndex];
          if (project && focusZone === 'content' && !selectedProject) {
            toggleFavorite(project.id_progetto);
          }
        } else {
          if (focusZone === 'menu') {
            const item = menuItems[focusedMenu];
            if (item) {
              setCurrentPage(item.id);
              setSelectedCategory(null);
              setSearchQuery('');
              setFocusZone('content');
              setFocusedCardIndex(0);
            }
          } else if (focusZone === 'content' && !selectedProject) {
            const filteredProjects = getFilteredProjects();
            const project = filteredProjects[focusedCardIndex];
            if (project) {
              setSelectedProject(project);
              setDetailFocusZone('buttons');
              setDetailSubIndex(0);
            }
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [loading, playing, selectedProject, focusedMenu, focusedCardIndex, currentPage, focusZone, detailFocusZone, detailSubIndex]);

  useEffect(() => {
    if (focusZone === 'content' && !selectedProject) {
      setTimeout(() => {
        const focusedElement = document.querySelector(`[data-card-index="${focusedCardIndex}"]`);
        if (focusedElement) {
          focusedElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 50);
    }
  }, [focusedCardIndex, focusZone, selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      setTimeout(() => {
        let selector = '';
        if (detailFocusZone === 'back') {
          selector = '[data-detail-back="true"]';
        } else if (detailFocusZone === 'genres') {
          selector = `[data-detail-genre="${detailSubIndex}"]`;
        } else if (detailFocusZone === 'actors') {
          selector = `[data-detail-actor="${detailSubIndex}"]`;
        } else if (detailFocusZone === 'buttons') {
          selector = `[data-detail-button="${detailSubIndex}"]`;
        } else if (detailFocusZone === 'episodes') {
          selector = `[data-detail-episode="${detailSubIndex}"]`;
        }
        
        const focusedElement = document.querySelector(selector);
        if (focusedElement) {
          focusedElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 50);
    }
  }, [detailFocusZone, detailSubIndex, selectedProject]);

  useEffect(() => {
    loadProjects();
    loadFavorites();
    loadHistory();
    setTimeout(() => setShowApp(true), 500);
  }, []);

  useEffect(() => {
    if (videoRef.current && playing) {
      const video = videoRef.current;
      
      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        const timeLeft = video.duration - video.currentTime;
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
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
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

  const handleMouseMove = () => setShowControls(true);

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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = pos * duration;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const loadProjects = async () => {
    try {
      const response = await fetch('https://raw.githubusercontent.com/mydramasubita-boop/listaprogettimydramafansub/refs/heads/main/metadati_fansub_test.json');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Errore caricamento:', error);
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem('mydrama_favorites');
    if (saved) {
      try {
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
        setHistory(JSON.parse(saved) as HistoryItem[]);
      } catch (e) {
        setHistory([]);
      }
    }
  };
  
  const toggleFavorite = (projectId: string) => {
    const newFavorites = favorites.includes(projectId)
      ? favorites.filter(id => id !== projectId)
      : [...favorites, projectId];
    setFavorites(newFavorites);
    localStorage.setItem('mydrama_favorites', JSON.stringify(newFavorites));
  };
  
  const addToHistory = (project: Project, episodeIndex = 0) => {
    const newHistory = [
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
    
    setTimeout(() => {
      lockOrientation();
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      if (videoRef.current?.requestFullscreen) {
        videoRef.current.requestFullscreen().catch(() => {});
      }
    }, 100);
  };

  const nextEpisode = () => {
    if (playing && playing.video_data.episodi && currentEpisode < playing.video_data.episodi.length - 1) {
      setCurrentEpisode(currentEpisode + 1);
      setShowNextButton(false);
      addToHistory(playing, currentEpisode + 1);
    }
  };

  const prevEpisode = () => {
    if (playing && currentEpisode > 0) {
      setCurrentEpisode(currentEpisode - 1);
      setShowNextButton(false);
      addToHistory(playing, currentEpisode - 1);
    }
  };

  const getFilteredProjects = (): Project[] => {
    let filtered = projects;

    if (currentPage === 'home') {
      const categories = ['film', 'drama', 'mini e web drama', 'altro'];
      const latestByCategory: Project[] = []; 
      categories.forEach(cat => {
        const categoryProjects = projects.filter(p => p.macro_categoria === cat).slice(0, 6);
        latestByCategory.push(...categoryProjects);
      });
      return latestByCategory;
    } else if (currentPage === 'favorites') {
      filtered = filtered.filter(p => favorites.includes(p.id_progetto));
    } else if (currentPage === 'history') {
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
        p.generi.some((g: string) => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.attori.some((a: string) => a.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  };

  const getAllSubCategories = () => {
    const subCategoriesByMacro: { [key: string]: string[] } = {
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

  const getSubCategories = () => getAllSubCategories();

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
        <video
          ref={preloaderVideoRef}
          autoPlay
          muted
          playsInline
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onTimeUpdate={(e: React.SyntheticEvent<HTMLVideoElement>) => {
            const video = e.target as HTMLVideoElement;
            const timeLeft = video.duration - video.currentTime;
            if (timeLeft <= 0.75 && timeLeft > 0) {
              video.style.opacity = (timeLeft / 0.75).toString();
            }
          }}
          onEnded={() => setLoading(false)}
          onError={() => setLoading(false)}
        >
          <source src="/preloader.mp4" type="video/mp4" />
        </video>
      </div>
    );
  }
  
  if (playing) {
    const videoUrl = playing.video_data.is_serie ? playing.video_data.episodi![currentEpisode].url_video : playing.video_data.url_video;

    return (
      <div style={{ width: '100%', height: '100vh', background: '#000', position: 'relative' }} onMouseMove={handleMouseMove} onClick={() => setShowControls(true)}>
        <video ref={videoRef} src={videoUrl} autoPlay muted={muted} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onClick={togglePlayPause} />
        
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: showControls ? 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.7) 100%)' : 'transparent', pointerEvents: showControls ? 'auto' : 'none', transition: 'background 0.3s ease', opacity: showControls ? 1 : 0 }}>
          <div style={{ position: 'absolute', top: '30px', left: '40px', right: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'all' }}>
            <button onClick={() => { setPlaying(null); setShowNextButton(false); setIsPlaying(true); }} style={{ padding: '18px 35px', background: 'rgba(0,0,0,0.8)', border: `2px solid ${colors.primary}`, borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
              <ChevronLeft size={24} /> Indietro
            </button>

            {playing.video_data.is_serie && playing.video_data.episodi && (
              <div style={{ background: 'rgba(0,0,0,0.8)', padding: '15px 30px', borderRadius: '12px', fontSize: '20px', fontWeight: 'bold' }}>
                {playing.video_data.episodi[currentEpisode].titolo_episodio}
              </div>
            )}

            <button onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }} style={{ padding: '18px', background: 'rgba(0,0,0,0.8)', border: `2px solid ${colors.primary}`, borderRadius: '12px', color: 'white', cursor: 'pointer' }}>
              {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          </div>

          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'all' }}>
            <button onClick={togglePlayPause} style={{ width: '80px', height: '80px', background: 'rgba(0,0,0,0.6)', border: `3px solid ${colors.primary}`, borderRadius: '50%', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isPlaying && showControls ? 0.7 : 1, transition: 'opacity 0.3s' }}>
              {isPlaying ? (<div style={{ display: 'flex', gap: '6px' }}><div style={{ width: '8px', height: '32px', background: 'white', borderRadius: '2px' }} /><div style={{ width: '8px', height: '32px', background: 'white', borderRadius: '2px' }} /></div>) : (<Play size={36} fill="white" style={{ marginLeft: '4px' }} />)}
            </button>
          </div>

          <div style={{ position: 'absolute', bottom: '30px', left: '40px', right: '40px', pointerEvents: 'all' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '60px' }}>{formatTime(currentTime)}</span>
                <div onClick={handleSeek} style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.3)', borderRadius: '4px', cursor: 'pointer', position: 'relative' }}>
                  <div style={{ width: `${(currentTime / duration) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`, borderRadius: '4px', position: 'relative' }}>
                    <div style={{ position: 'absolute', right: '-6px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', background: 'white', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }} />
                  </div>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '60px' }}>{formatTime(duration)}</span>
              </div>
            </div>

            {playing.video_data.is_serie && playing.video_data.episodi && (
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {currentEpisode > 0 && (<button onClick={prevEpisode} style={{ padding: '18px 35px', background: 'rgba(0,0,0,0.8)', border: `2px solid ${colors.primary}`, borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}><SkipBack size={20} /> Precedente</button>)}
                {currentEpisode < playing.video_data.episodi.length - 1 && (<button onClick={nextEpisode} style={{ padding: '18px 35px', background: 'rgba(0,0,0,0.8)', border: `2px solid ${colors.primary}`, borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>Successivo <SkipForward size={20} /></button>)}
              </div>
            )}
          </div>

          {showNextButton && playing.video_data.is_serie && playing.video_data.episodi && currentEpisode < playing.video_data.episodi.length - 1 && (
            <div style={{ position: 'absolute', bottom: '140px', right: '40px', pointerEvents: 'all' }}>
              <button onClick={nextEpisode} style={{ padding: '20px 40px', background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, border: 'none', borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', gap: '15px', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold', animation: 'pulse 1.5s infinite', boxShadow: `0 0 30px ${colors.primary}` }}>Vai all'episodio successivo <SkipForward size={24} /></button>
            </div>
          )}
        </div>

        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
      </div>
    );
  }

  if (selectedProject) {
    return (
      <div style={{ width: '100%', minHeight: '100vh', background: `url(https://wh1373514.ispot.cc/wp/wp-content/MY%20DRAMA%20TV/FILEAPP/background.png)`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', color: 'white', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, overflowY: 'auto' }}>
        <div style={{ position: 'relative', zIndex: 2, padding: '60px', paddingTop: '200px' }}>
          <button 
            data-detail-back="true"
            onClick={() => {
              setSelectedProject(null);
              setDetailFocusZone('buttons');
              setDetailSubIndex(0);
              setFocusZone('content');
            }} 
            style={{ 
              padding: '25px 45px', 
              background: 'rgba(0,0,0,0.95)', 
              border: `3px solid ${detailFocusZone === 'back' ? '#fff' : colors.primary}`, 
              borderRadius: '15px', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px', 
              fontSize: '26px', 
              cursor: 'pointer', 
              marginBottom: '50px', 
              fontWeight: 'bold',
              boxShadow: detailFocusZone === 'back' ? `0 0 30px ${colors.primary}` : 'none',
              transform: detailFocusZone === 'back' ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s'
            }}>
            <ChevronLeft size={32} /> Indietro
          </button>

          <div style={{ display: 'flex', gap: '60px', marginBottom: '60px', flexWrap: 'wrap' }}>
            <img src={selectedProject.url_poster_verticale} alt={selectedProject.titolo} style={{ width: '400px', height: '600px', objectFit: 'cover', borderRadius: '20px', boxShadow: `0 30px 80px rgba(255,20,147,0.5)` }} />

            <div style={{ flex: 1, minWidth: '400px' }}>
              <h1 style={{ fontSize: '64px', marginBottom: '30px', lineHeight: '1.2', textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}>{selectedProject.titolo}</h1>
              
              <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                {selectedProject.generi.map((genere: string, i: number) => (
                  <span 
                    key={i} 
                    data-detail-genre={i}
                    onClick={() => { 
                      setSearchQuery(genere); 
                      setCurrentPage('search'); 
                      setSelectedProject(null); 
                      setDetailFocusZone('buttons');
                      setDetailSubIndex(0);
                    }} 
                    style={{ 
                      padding: '15px 30px', 
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, 
                      borderRadius: '30px', 
                      fontSize: '20px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      boxShadow: detailFocusZone === 'genres' && detailSubIndex === i ? `0 0 30px ${colors.primary}` : '0 4px 15px rgba(0,0,0,0.3)',
                      border: `3px solid ${detailFocusZone === 'genres' && detailSubIndex === i ? '#fff' : 'transparent'}`,
                      transform: detailFocusZone === 'genres' && detailSubIndex === i ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.3s'
                    }}>
                    {genere}
                  </span>
                ))}
              </div>

              <p style={{ fontSize: '24px', lineHeight: '1.8', marginBottom: '40px', textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>{selectedProject.descrizione}</p>

              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '28px', marginBottom: '20px', opacity: 0.9 }}>Cast:</h3>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {selectedProject.attori.map((attore: string, i: number) => (
                    <span 
                      key={i} 
                      data-detail-actor={i}
                      onClick={() => { 
                        setSearchQuery(attore); 
                        setCurrentPage('search'); 
                        setSelectedProject(null);
                        setDetailFocusZone('buttons');
                        setDetailSubIndex(0);
                      }} 
                      style={{ 
                        padding: '12px 25px', 
                        background: 'rgba(255,20,147,0.9)', 
                        borderRadius: '10px', 
                        fontSize: '18px', 
                        cursor: 'pointer', 
                        fontWeight: 'bold', 
                        boxShadow: detailFocusZone === 'actors' && detailSubIndex === i ? `0 0 30px ${colors.primary}` : '0 4px 15px rgba(0,0,0,0.3)',
                        border: `3px solid ${detailFocusZone === 'actors' && detailSubIndex === i ? '#fff' : 'transparent'}`,
                        transform: detailFocusZone === 'actors' && detailSubIndex === i ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.3s'
                      }}>
                      {attore}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', gap: '25px', marginTop: '40px', flexWrap: 'wrap' }}>
                <button 
                  data-detail-button={0}
                  onClick={() => toggleFavorite(selectedProject.id_progetto)} 
                  style={{ 
                    padding: '22px 45px', 
                    background: detailFocusZone === 'buttons' && detailSubIndex === 0 ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` : favorites.includes(selectedProject.id_progetto) ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` : 'rgba(255,255,255,0.15)', 
                    border: `3px solid ${detailFocusZone === 'buttons' && detailSubIndex === 0 ? '#fff' : colors.primary}`, 
                    borderRadius: '15px', 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '15px', 
                    fontSize: '22px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    boxShadow: detailFocusZone === 'buttons' && detailSubIndex === 0 ? `0 0 30px ${colors.primary}` : 'none', 
                    transform: detailFocusZone === 'buttons' && detailSubIndex === 0 ? 'scale(1.05)' : 'scale(1)', 
                    transition: 'all 0.3s' 
                  }}>
                  <Heart size={28} fill={favorites.includes(selectedProject.id_progetto) ? 'white' : 'none'} />
                  {favorites.includes(selectedProject.id_progetto) ? 'Rimuovi' : 'Aggiungi'}
                </button>

                {!selectedProject.video_data.is_serie && (
                  <button 
                    data-detail-button={1}
                    onClick={() => playVideo(selectedProject)} 
                    style={{ 
                      padding: '28px 65px', 
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, 
                      border: detailFocusZone === 'buttons' && detailSubIndex === 1 ? '3px solid #fff' : 'none', 
                      borderRadius: '15px', 
                      color: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '20px', 
                      fontSize: '30px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      boxShadow: detailFocusZone === 'buttons' && detailSubIndex === 1 ? `0 0 30px ${colors.primary}` : `0 15px 50px rgba(255,20,147,0.6)`, 
                      transform: detailFocusZone === 'buttons' && detailSubIndex === 1 ? 'scale(1.05)' : 'scale(1)', 
                      transition: 'all 0.3s' 
                    }}>
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
                {selectedProject.video_data.episodi.map((ep: Episodio, i: number) => (
                  <button 
                    key={i} 
                    data-detail-episode={i}
                    onClick={() => playVideo(selectedProject, i)} 
                    style={{ 
                      padding: '30px', 
                      background: 'rgba(26,26,26,0.95)', 
                      border: `3px solid ${detailFocusZone === 'episodes' && detailSubIndex === i ? '#fff' : colors.primary}`, 
                      borderRadius: '15px', 
                      color: 'white', 
                      textAlign: 'left', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '25px', 
                      fontSize: '24px', 
                      fontWeight: 'bold', 
                      transition: 'all 0.3s', 
                      boxShadow: detailFocusZone === 'episodes' && detailSubIndex === i ? `0 0 30px ${colors.primary}` : 'none', 
                      transform: detailFocusZone === 'episodes' && detailSubIndex === i ? 'scale(1.05)' : 'scale(1)' 
                    }}>
                    <div style={{ width: '60px', height: '60px', background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Play size={32} fill="white" /></div>
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
    <div style={{ width: '100%', minHeight: '100vh', background: `url(https://wh1373514.ispot.cc/wp/wp-content/MY%20DRAMA%20TV/FILEAPP/background.png)`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', color: 'white', opacity: showApp ? 1 : 0, transition: 'opacity 0.5s ease-in' }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <header style={{ 
  position: 'fixed', 
  top: 0, 
  left: 0, 
  right: 0, 
  zIndex: 100, 
  padding: '5px 40px',
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'space-between', 
  background: 'rgba(0,0,0,0.95)', 
  backdropFilter: 'blur(10px)', 
  borderBottom: `4px solid ${colors.primary}`,
  height: '100px'
}}>
  <img src="https://wh1373514.ispot.cc/wp/wp-content/MY%20DRAMA%20TV/FILEAPP/logo.svg" alt="My Drama Life" style={{ height: '50px', width: 'auto', flexShrink: 0 }} />

  <nav style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, justifyContent: 'flex-end', overflowX: 'hidden' }}>
    {menuItems.map((item, index) => {
      const Icon = item.icon;
      const isFocused = focusZone === 'menu' && focusedMenu === index;
      const isActive = currentPage === item.id;
      return (
        <button key={item.id} onClick={() => { setCurrentPage(item.id); setSelectedCategory(null); setSearchQuery(''); setFocusedCardIndex(0); setFocusZone('content'); }} style={{ padding: '8px 12px', background: isActive ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` : 'transparent', border: isFocused ? `3px solid ${colors.primary}` : '3px solid transparent', outline: 'none', borderRadius: '8px', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'bold', transform: isFocused ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.2s', minWidth: '65px', boxShadow: isFocused ? `0 0 20px ${colors.primary}` : 'none', flexShrink: 0 }}>
          <Icon size={20} />
          <span style={{ fontSize: '11px', textAlign: 'center', whiteSpace: 'nowrap' }}>{item.label}</span>
        </button>
      );
    })}
  </nav>
</header>

        <main style={{ 
  padding: '40px 60px', 
  paddingTop: currentPage === 'search' ? '200px' : '120px',
  minHeight: '100vh' 
}}>
          {currentPage === 'home' && (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px', marginBottom: '20px' }}><h1 style={{ fontSize: '38px', textShadow: '0 4px 20px rgba(0,0,0,0.9)', margin: 0 }}>Ultime uscite</h1></div>)}

          {(currentPage === 'favorites' || (currentPage === 'history' && history.length === 0)) && (<div style={{ minHeight: '80px', marginBottom: '20px' }} />)}

          {currentPage === 'search' && (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px', marginBottom: '20px' }}><input type="text" placeholder="Cerca per titolo, genere o attore..." value={searchQuery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} style={{ width: '100%', maxWidth: '800px', padding: '25px', fontSize: '24px', background: 'rgba(26,26,26,0.9)', border: `3px solid ${colors.primary}`, borderRadius: '15px', color: 'white', outline: 'none' }} /></div>)}

          {currentPage === 'history' && history.length > 0 && (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px', marginBottom: '20px' }}><button onClick={clearHistory} style={{ padding: '12px 24px', background: colors.primary, border: 'none', borderRadius: '10px', color: 'white', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>Cancella Cronologia</button></div>)}

          {['film', 'drama', 'mini', 'altro'].includes(currentPage) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={() => setSelectedCategory(null)} style={{ padding: '12px 24px', background: !selectedCategory ? colors.primary : 'rgba(26,26,26,0.9)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>Tutte</button>
                {getSubCategories().map((cat: string) => (<button key={cat} onClick={() => setSelectedCategory(cat)} style={{ padding: '12px 24px', background: selectedCategory === cat ? colors.primary : 'rgba(26,26,26,0.9)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>{cat}</button>))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '35px' }}>
            {getFilteredProjects().map((project: Project, index: number) => {
              const isFocused = focusZone === 'content' && focusedCardIndex === index;
              const isOnAir = project.generi.some(g => g.toLowerCase() === 'onair' || g.toLowerCase() === 'on air');
              return (
                <div key={project.id_progetto} data-card-index={index} style={{ background: 'rgba(26,26,26,0.9)', borderRadius: '15px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s', transform: isFocused ? 'scale(1.15)' : 'scale(1)', boxShadow: isFocused ? `0 0 40px ${colors.primary}` : 'none', border: `3px solid ${isFocused ? colors.primary : 'transparent'}`, zIndex: isFocused ? 10 : 1 }} onClick={() => setSelectedProject(project)}>
                  <div style={{ position: 'relative' }}>
                    <img src={project.url_poster_verticale} alt={project.titolo} style={{ width: '100%', height: '375px', objectFit: 'cover' }} />
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(project.id_progetto); }} style={{ position: 'absolute', top: '15px', left: '15px', background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}><Heart size={24} fill={favorites.includes(project.id_progetto) ? colors.primary : 'none'} color={favorites.includes(project.id_progetto) ? colors.primary : 'white'} /></button>
                  </div>

                  <div style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '20px', marginBottom: '12px', lineHeight: '1.3' }}>{project.titolo}</h3>
                    <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '8px' }}>{project.macro_categoria} • {project.sub_categoria}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontSize: '14px', opacity: 0.7, flex: 1 }}>{project.generi.filter((g: string) => g.toLowerCase() !== 'onair' && g.toLowerCase() !== 'on air').slice(0, 2).join(', ')}{project.generi.filter((g: string) => g.toLowerCase() !== 'onair' && g.toLowerCase() !== 'on air').length > 2 && '...'}</div>
                      {isOnAir && (<div style={{ color: '#FF0000', fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>ONAIR</div>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {getFilteredProjects().length === 0 && (<div style={{ textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' }}><img src="https://wh1373514.ispot.cc/wp/wp-content/MY%20DRAMA%20TV/FILEAPP/No_Found_loop.gif" alt="Nessun contenuto" style={{ width: '300px', height: 'auto', borderRadius: '15px' }} /><p style={{ fontSize: '28px', fontWeight: 'bold', opacity: 0.8 }}>Ci dispiace, non c'è nulla da vedere qui</p></div>)}
        </main>

        <footer style={{ padding: '20px 50px', textAlign: 'center', borderTop: '2px solid rgba(255,255,255,0.1)', marginTop: '80px', background: 'rgba(0,0,0,0.5)' }}><p style={{ opacity: 0.6, fontSize: '18px' }}>My Drama Life TV © 2025 all right reserved - Created by gswebagency.net</p></footer>
      </div>
    </div>
  );
};

export default MyDramaApp;
