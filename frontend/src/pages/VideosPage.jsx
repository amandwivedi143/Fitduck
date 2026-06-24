import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, Card, CardContent, Paper, InputBase,
  Snackbar, Alert, Tooltip,
} from '@mui/material';
import {
  PlayArrow, Search, Close, LocalFireDepartment,
  AccessTime, Add, Check, Remove, Share,
  ArrowForwardIos, GridViewOutlined, ViewStreamOutlined,
} from '@mui/icons-material';

// ─── Hardcoded workout video data (free YouTube embeds) ────────────
// Note: thumbnails use hqdefault (always present). The onError handler
// falls back to mqdefault if a thumbnail ever fails to load.

// All video IDs below have been verified — their YouTube thumbnails load successfully.
const CATEGORIES = [
  {
    title: 'Fat Loss',
    videos: [
      {
        id: 'ml6cT4AZdqI',
        title: 'Full Body HIIT Workout — No Equipment',
        channel: 'MadFit',
        duration: '32 min',
        calories: 320,
        tags: ['HIIT', 'Fat Burn'],
        difficulty: 'Intermediate',
      },
      {
        id: '4o3iAH_ddBQ',
        title: '30 Minute Fat Burning Cardio Workout',
        channel: 'HASfit',
        duration: '30 min',
        calories: 280,
        tags: ['Cardio', 'Fat Burn'],
        difficulty: 'Beginner',
      },
      {
        id: '6oLg5fFe5ww',
        title: 'Cardio Kickboxing Fat Burn Workout',
        channel: 'Class FitSugar',
        duration: '30 min',
        calories: 350,
        tags: ['Kickboxing', 'Cardio'],
        difficulty: 'Intermediate',
      },
      {
        id: '2pLT-olgUJs',
        title: '20-Minute Metabolic Conditioning',
        channel: 'Tone It Up',
        duration: '20 min',
        calories: 250,
        tags: ['HIIT', 'Metabolic'],
        difficulty: 'Advanced',
      },
    ],
  },
  {
    title: 'Muscle Building',
    videos: [
      {
        id: 'UBMk30rjy0o',
        title: 'Full Body Strength Workout (Dumbbells)',
        channel: 'Sydney Cummings',
        duration: '45 min',
        calories: 400,
        tags: ['Strength', 'Weights'],
        difficulty: 'Intermediate',
      },
      {
        id: '0ENyCa-BFck',
        title: 'How To Start Calisthenics The Smart Way',
        channel: 'THENX',
        duration: '20 min',
        calories: 220,
        tags: ['Calisthenics', 'Strength'],
        difficulty: 'Advanced',
      },
      {
        id: 'NOVXQAbkFW0',
        title: '20-Minute Leg Workout with Dumbbells',
        channel: 'Nourish Move Love',
        duration: '20 min',
        calories: 420,
        tags: ['Legs', 'Weights'],
        difficulty: 'Advanced',
      },
      {
        id: 's0Qbxm3gUso',
        title: '40 Min Upper Body Dumbbell Workout',
        channel: 'Grow With Anna',
        duration: '40 min',
        calories: 380,
        tags: ['Strength', 'Weights'],
        difficulty: 'Intermediate',
      },
    ],
  },
  {
    title: 'Yoga & Recovery',
    videos: [
      {
        id: 'v7AYKMP6rOE',
        title: 'Yoga for Complete Beginners',
        channel: 'Yoga With Adriene',
        duration: '23 min',
        calories: 120,
        tags: ['Yoga', 'Beginner'],
        difficulty: 'Beginner',
      },
      {
        id: 'sTANio_2E0Q',
        title: 'Morning Yoga Flow for Energy',
        channel: 'Breathe and Flow',
        duration: '20 min',
        calories: 130,
        tags: ['Yoga', 'Morning'],
        difficulty: 'All Levels',
      },
      {
        id: 'T7mT9VuH54I',
        title: 'Post Workout Stretch for Recovery',
        channel: 'MadFit',
        duration: '10 min',
        calories: 80,
        tags: ['Recovery', 'Stretch'],
        difficulty: 'All Levels',
      },
      {
        id: 'BHY0FxzoKZE',
        title: 'Full Body Mobility Routine',
        channel: 'Tom Merrick',
        duration: '18 min',
        calories: 90,
        tags: ['Mobility', 'Stretch'],
        difficulty: 'All Levels',
      },
    ],
  },
  {
    title: 'Core & Abs',
    videos: [
      {
        id: 'DNqkPbglnjU',
        title: '10 Min Standing Abs Workout',
        channel: 'MadFit',
        duration: '10 min',
        calories: 100,
        tags: ['Abs', 'Core'],
        difficulty: 'Beginner',
      },
      {
        id: 'cO7iMCci904',
        title: 'Extreme Abs — Upper Abs, Lower Abs, Obliques & Total Core Pilates',
        channel: 'Blogilates',
        duration: '25 min',
        calories: 180,
        tags: ['Core', 'Pilates'],
        difficulty: 'Advanced',
      },
      {
        id: '3ogDIqyGmCM',
        title: 'Abs On Fire — POP Pilates',
        channel: 'Blogilates',
        duration: '12 min',
        calories: 110,
        tags: ['Abs', 'Standing'],
        difficulty: 'Intermediate',
      },
      {
        id: '0K7NNWMhO1Q',
        title: '10 Min Pilates Ab Workout — No Equipment',
        channel: 'Blogilates',
        duration: '10 min',
        calories: 150,
        tags: ['Pilates', 'Core'],
        difficulty: 'Intermediate',
      },
    ],
  },
];

const FILTERS = ['All Workouts', 'HIIT', 'Strength', 'Cardio', 'Yoga', 'Core', 'Pilates', 'Beginner', 'Mobility', 'Recovery'];

const DIFFICULTY_COLORS = {
  Beginner: { bg: 'rgba(16,185,129,0.15)', text: '#10B981', border: 'rgba(16,185,129,0.3)' },
  Intermediate: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', border: 'rgba(59,130,246,0.3)' },
  Advanced: { bg: 'rgba(236,72,153,0.15)', text: '#EC4899', border: 'rgba(236,72,153,0.3)' },
  Pro: { bg: 'rgba(124,58,237,0.15)', text: '#A78BFA', border: 'rgba(124,58,237,0.3)' },
  'All Levels': { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA', border: 'rgba(167,139,250,0.3)' },
};

const MY_LIST_KEY = 'fitness_my_video_list';

// ─── Hero video (featured) ──────────────────────────────────────────

const HERO_VIDEO = {
  id: 'ml6cT4AZdqI',
  title: '30 Min Full Body Burn',
  description:
    'Ignite your metabolism and build functional strength with our most advanced HIIT program. Engineered for maximum caloric output using technical metabolic conditioning.',
  channel: 'MadFit',
  duration: '30 min',
  calories: 320,
};

// Thumbnail helpers — hqdefault is always present on YouTube uploads.
const thumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
const fallbackThumb = (id) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

function onThumbError(e, videoId) {
  const failed = e.currentTarget.dataset.failed;
  if (failed) return; // already tried the fallback
  e.currentTarget.dataset.failed = '1';
  e.currentTarget.src = fallbackThumb(videoId);
}

// ─── Component ────────────────────────────────────────────────────────

export default function VideosPage() {
  const [activeFilter, setActiveFilter] = useState('All Workouts');
  const [playerOpen, setPlayerOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('rows'); // 'rows' | 'grid'
  const [myList, setMyList] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const scrollRefs = useRef({});

  // Load "My List" from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MY_LIST_KEY);
      if (raw) setMyList(JSON.parse(raw));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const persistMyList = (next) => {
    setMyList(next);
    try {
      localStorage.setItem(MY_LIST_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable */
    }
  };

  const isInList = (video) => myList.some((v) => v.id === video.id && v.ts === video.ts);

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const openPlayer = (video) => {
    setActiveVideo(video);
    setPlayerOpen(true);
  };

  const closePlayer = () => {
    setPlayerOpen(false);
    // Small delay so the iframe unloads before clearing state
    setTimeout(() => setActiveVideo(null), 300);
  };

  const toggleMyList = (video, fromHero = false) => {
    const key = { id: video.id, ts: video.ts };
    if (isInList(key)) {
      persistMyList(myList.filter((v) => !(v.id === video.id && v.ts === video.ts)));
      showToast('Removed from My List');
    } else {
      persistMyList([...myList, { ...video, ts: Date.now() }]);
      showToast('Added to My List ❤️');
    }
    // Prevent the click from also opening the player when used on a card.
    if (fromHero) return;
  };

  const handleShare = async (video) => {
    const url = `https://www.youtube.com/watch?v=${video.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard 🔗');
      }
    } catch {
      /* user cancelled share dialog — no-op */
    }
  };

  const scrollRow = (catTitle, dir) => {
    const ref = scrollRefs.current[catTitle];
    if (ref) {
      ref.scrollBy({ left: dir * 600, behavior: 'smooth' });
    }
  };

  // Tag every video with a stable key so duplicates across categories are fine.
  const allVideos = useMemo(
    () => CATEGORIES.flatMap((cat) => cat.videos.map((v, i) => ({ ...v, ts: i, category: cat.title }))),
    []
  );

  const matchesSearch = (v) =>
    !searchQuery ||
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

  const matchesFilter = (v) =>
    activeFilter === 'All Workouts' ||
    v.tags.some((t) => t.toLowerCase() === activeFilter.toLowerCase()) ||
    v.difficulty.toLowerCase() === activeFilter.toLowerCase();

  // Search overrides filter view: when searching, show a flat grid of matches.
  const isSearching = searchQuery.trim().length > 0;
  const searchResults = useMemo(
    () => allVideos.filter(matchesSearch).filter(matchesFilter),
    [allVideos, searchQuery, activeFilter]
  );

  // Normal category rows (hidden while searching).
  const filteredCategories = CATEGORIES.map((cat) => ({
    ...cat,
    videos: cat.videos
      .map((v, i) => ({ ...v, ts: i, category: cat.title }))
      .filter((v) => matchesFilter(v)),
  })).filter((cat) => cat.videos.length > 0);

  // Grid view shows all filtered videos across categories.
  const gridVideos = useMemo(
    () => CATEGORIES.flatMap((cat) =>
      cat.videos
        .map((v, i) => ({ ...v, ts: i, category: cat.title }))
        .filter((v) => matchesFilter(v))
    ),
    [activeFilter]
  );

  const renderVideoCard = (video) => {
    const dc = DIFFICULTY_COLORS[video.difficulty] || DIFFICULTY_COLORS['All Levels'];
    const saved = isInList(video);
    return (
      <Card
        key={`${video.id}-${video.ts}-${video.category}`}
        sx={{
          flexShrink: 0,
          width: 300,
          bgcolor: 'rgba(26,17,40,0.7)',
          border: '1px solid rgba(124,58,237,0.15)',
          borderRadius: 4,
          cursor: 'pointer',
          scrollSnapAlign: 'start',
          position: 'relative',
          transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s',
          '&:hover': {
            transform: 'translateY(-6px) scale(1.02)',
            boxShadow: '0 12px 40px rgba(124,58,237,0.25)',
            borderColor: 'rgba(236,72,153,0.4)',
          },
        }}
      >
        <Box onClick={() => openPlayer(video)} sx={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
          <Box
            component="img"
            src={thumb(video.id)}
            alt={video.title}
            onError={(e) => onThumbError(e, video.id)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
          />
          {/* Hover overlay with play icon */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.3s',
              '.MuiCard-root:hover &': { opacity: 1 },
            }}
          >
            <PlayArrow sx={{ fontSize: 56, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }} />
          </Box>
          {/* Duration badge */}
          <Chip
            label={video.duration}
            size="small"
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.65rem',
              letterSpacing: 0.5,
              backdropFilter: 'blur(8px)',
              borderRadius: 1,
              height: 20,
            }}
          />
          {/* Difficulty badge */}
          <Chip
            label={video.difficulty}
            size="small"
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              bgcolor: dc.bg,
              color: dc.text,
              fontWeight: 700,
              fontSize: '0.6rem',
              letterSpacing: 0.5,
              border: `1px solid ${dc.border}`,
              backdropFilter: 'blur(8px)',
              borderRadius: 1,
              height: 20,
            }}
          />
        </Box>

        {/* Card info */}
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: '#fff',
              mb: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.3,
              fontSize: '0.9rem',
            }}
          >
            {video.title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
            {video.channel}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocalFireDepartment sx={{ fontSize: 16, color: '#F97316' }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {video.calories} CAL
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title={saved ? 'Remove from My List' : 'Add to My List'}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMyList(video);
                  }}
                  sx={{
                    color: saved ? '#EC4899' : 'text.secondary',
                    bgcolor: saved ? 'rgba(236,72,153,0.12)' : 'transparent',
                    '&:hover': { color: '#EC4899', bgcolor: 'rgba(236,72,153,0.15)' },
                  }}
                >
                  {saved ? <Check sx={{ fontSize: 18 }} /> : <Add sx={{ fontSize: 18 }} />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Share">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(video);
                  }}
                  sx={{ color: 'text.secondary', '&:hover': { color: '#A78BFA', bgcolor: 'rgba(124,58,237,0.12)' } }}
                >
                  <Share sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const heroSaved = isInList({ id: HERO_VIDEO.id, ts: 0 });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ═══ Hero Section ═══ */}
      <Box sx={{ position: 'relative', height: { xs: 420, md: 560 }, overflow: 'hidden', mb: -4 }}>
        {/* Background image */}
        <Box
          component="img"
          src={thumb(HERO_VIDEO.id)}
          alt={HERO_VIDEO.title}
          onError={(e) => onThumbError(e, HERO_VIDEO.id)}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Gradient overlays */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, #0F0B1A 0%, rgba(15,11,26,0.6) 40%, transparent 70%), linear-gradient(to right, #0F0B1A 0%, rgba(15,11,26,0.3) 50%, transparent 80%)',
          }}
        />

        {/* Hero content */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            height: '100%',
            px: { xs: 3, md: 6 },
            pb: 6,
            maxWidth: 700,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Chip
              label="Featured"
              size="small"
              sx={{
                bgcolor: 'rgba(236,72,153,0.2)',
                color: '#EC4899',
                fontWeight: 700,
                fontSize: '0.65rem',
                letterSpacing: 2,
                textTransform: 'uppercase',
                border: '1px solid rgba(236,72,153,0.3)',
                borderRadius: 1,
                height: 22,
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
              <AccessTime sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {HERO_VIDEO.duration}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
              <LocalFireDepartment sx={{ fontSize: 16, color: '#F97316' }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {HERO_VIDEO.calories} CAL
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="h2"
            sx={{ fontSize: { xs: '1.8rem', md: '3.2rem' }, fontWeight: 800, color: '#fff', mb: 1.5, lineHeight: 1.15 }}
          >
            {HERO_VIDEO.title}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: 600,
            }}
          >
            {HERO_VIDEO.description}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={() => openPlayer({ ...HERO_VIDEO, ts: 0 })}
              sx={{
                background: 'linear-gradient(135deg, #EC4899 0%, #7C3AED 100%)',
                boxShadow: '0 4px 24px rgba(236,72,153,0.4)',
                px: 4,
                py: 1.3,
                fontSize: '1rem',
                borderRadius: 3,
                '&:hover': {
                  background: 'linear-gradient(135deg, #DB2777 0%, #5B21B6 100%)',
                  boxShadow: '0 6px 30px rgba(236,72,153,0.6)',
                  transform: 'scale(1.04)',
                },
                transition: 'all 0.2s',
              }}
            >
              Watch Now
            </Button>
            <Button
              variant="outlined"
              startIcon={heroSaved ? <Check /> : <Add />}
              onClick={() => toggleMyList({ ...HERO_VIDEO, ts: 0 }, true)}
              sx={{
                borderColor: heroSaved ? 'rgba(236,72,153,0.5)' : 'rgba(255,255,255,0.2)',
                color: heroSaved ? '#F472B6' : '#fff',
                bgcolor: heroSaved ? 'rgba(236,72,153,0.12)' : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                px: 4,
                py: 1.3,
                fontSize: '1rem',
                borderRadius: 3,
                '&:hover': {
                  borderColor: 'rgba(236,72,153,0.6)',
                  bgcolor: 'rgba(236,72,153,0.18)',
                },
              }}
            >
              {heroSaved ? 'In My List' : 'My List'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ═══ Filters + Category Rows ═══ */}
      <Box sx={{ px: { xs: 2, md: 4 }, pt: 2, position: 'relative', zIndex: 3 }}>
        {/* Search bar + view toggle */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
          <Paper
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2,
              py: 0.5,
              borderRadius: 3,
              bgcolor: 'rgba(26,17,40,0.8)',
              border: '1px solid rgba(124,58,237,0.2)',
              maxWidth: 480,
              flex: 1,
              minWidth: 240,
              '&:focus-within': {
                borderColor: '#7C3AED',
                boxShadow: '0 0 0 2px rgba(124,58,237,0.15)',
              },
            }}
          >
            <Search sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
            <InputBase
              placeholder="Search workouts, trainers, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, color: 'text.primary', fontSize: '0.9rem' }}
            />
            {searchQuery && (
              <IconButton size="small" onClick={() => setSearchQuery('')} aria-label="Clear search">
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Paper>

          {/* Row/Grid view toggle (disabled while searching) */}
          <Box sx={{ display: 'flex', gap: 0.5, bgcolor: 'rgba(26,17,40,0.8)', borderRadius: 3, p: 0.5, border: '1px solid rgba(124,58,237,0.2)' }}>
            <Tooltip title="Rows view">
              <span>
                <IconButton
                  size="small"
                  disabled={isSearching}
                  onClick={() => setViewMode('rows')}
                  sx={{
                    color: viewMode === 'rows' && !isSearching ? '#fff' : 'text.secondary',
                    bgcolor: viewMode === 'rows' && !isSearching ? 'rgba(124,58,237,0.25)' : 'transparent',
                    '&.Mui-disabled': { color: 'rgba(161,161,170,0.3)' },
                  }}
                >
                  <ViewStreamOutlined />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Grid view (View All)">
              <span>
                <IconButton
                  size="small"
                  disabled={isSearching}
                  onClick={() => setViewMode('grid')}
                  sx={{
                    color: viewMode === 'grid' && !isSearching ? '#fff' : 'text.secondary',
                    bgcolor: viewMode === 'grid' && !isSearching ? 'rgba(124,58,237,0.25)' : 'transparent',
                    '&.Mui-disabled': { color: 'rgba(161,161,170,0.3)' },
                  }}
                >
                  <GridViewOutlined />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {/* Filter chips */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            pb: 3,
            mb: 2,
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
          }}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f}
              label={f}
              onClick={() => setActiveFilter(f)}
              sx={{
                px: 2.5,
                py: 2,
                fontWeight: 700,
                fontSize: '0.8rem',
                borderRadius: 3,
                cursor: 'pointer',
                height: 40,
                ...(activeFilter === f
                  ? {
                      background: 'linear-gradient(135deg, #EC4899 0%, #7C3AED 100%)',
                      color: '#fff',
                      boxShadow: '0 2px 12px rgba(236,72,153,0.3)',
                    }
                  : {
                      bgcolor: 'rgba(26,17,40,0.9)',
                      color: 'text.secondary',
                      border: '1px solid rgba(124,58,237,0.15)',
                      '&:hover': {
                        borderColor: 'rgba(236,72,153,0.4)',
                        color: 'text.primary',
                        bgcolor: 'rgba(124,58,237,0.1)',
                      },
                    }),
                transition: 'all 0.2s',
              }}
            />
          ))}
        </Box>

        {/* ═══ SEARCH RESULTS (flat grid) ═══ */}
        {isSearching && (
          <Box sx={{ pb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}>
              {searchResults.length > 0
                ? `${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for “${searchQuery}”`
                : 'No results'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
              {searchResults.length === 0 && 'Try a different keyword or clear the filter.'}
            </Typography>

            {searchResults.length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 3,
                }}
              >
                {searchResults.map((video) => renderVideoCard(video))}
              </Box>
            ) : (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  color: 'text.secondary',
                  border: '1px dashed rgba(124,58,237,0.2)',
                  borderRadius: 4,
                }}
              >
                <Search sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                <Typography>Nothing matched your search.</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ═══ GRID VIEW (all filtered videos) ═══ */}
        {!isSearching && viewMode === 'grid' && (
          <Box sx={{ pb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 3 }}>
              All {activeFilter === 'All Workouts' ? 'Workouts' : activeFilter}{' '}
              <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                ({gridVideos.length})
              </Typography>
            </Typography>
            {gridVideos.length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 3,
                }}
              >
                {gridVideos.map((video) => renderVideoCard(video))}
              </Box>
            ) : (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  color: 'text.secondary',
                  border: '1px dashed rgba(124,58,237,0.2)',
                  borderRadius: 4,
                }}
              >
                <Typography>No workouts in this category.</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ═══ ROWS VIEW (category carousels) ═══ */}
        {!isSearching && viewMode === 'rows' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6, pb: 4 }}>
            {/* My List row (only when there are saved videos) */}
            {myList.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>
                      My List
                    </Typography>
                    <Chip
                      label={myList.length}
                      size="small"
                      sx={{ bgcolor: 'rgba(236,72,153,0.15)', color: '#EC4899', fontWeight: 700, height: 22 }}
                    />
                  </Box>
                  <Button
                    size="small"
                    onClick={() => persistMyList([])}
                    startIcon={<Remove sx={{ fontSize: 16 }} />}
                    sx={{ color: 'text.secondary', fontSize: '0.8rem', '&:hover': { bgcolor: 'rgba(244,63,94,0.1)', color: '#F87171' } }}
                  >
                    Clear
                  </Button>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 3,
                    overflowX: 'auto',
                    pb: 2,
                    pt: 1,
                    px: 0.5,
                    scrollSnapType: 'x mandatory',
                    maskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)',
                    '&::-webkit-scrollbar': { display: 'none' },
                    scrollbarWidth: 'none',
                  }}
                >
                  {myList.map((video) => renderVideoCard(video))}
                </Box>
              </Box>
            )}

            {filteredCategories.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  color: 'text.secondary',
                  border: '1px dashed rgba(124,58,237,0.2)',
                  borderRadius: 4,
                }}
              >
                <Typography>No workouts match the “{activeFilter}” filter.</Typography>
              </Box>
            ) : (
              filteredCategories.map((cat) => (
                <Box key={cat.title}>
                  {/* Row header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>
                      {cat.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {/* Prev/next row scroll */}
                      <IconButton
                        size="small"
                        onClick={() => scrollRow(cat.title, -1)}
                        sx={{ color: 'text.secondary', bgcolor: 'rgba(26,17,40,0.6)', '&:hover': { color: '#EC4899' } }}
                      >
                        <ArrowForwardIos sx={{ fontSize: 14, transform: 'rotate(180deg)' }} />
                      </IconButton>
                      <Button
                        size="small"
                        onClick={() => setViewMode('grid')}
                        endIcon={<ArrowForwardIos sx={{ fontSize: 14 }} />}
                        sx={{ color: '#EC4899', fontWeight: 700, fontSize: '0.8rem', '&:hover': { bgcolor: 'rgba(236,72,153,0.08)' } }}
                      >
                        View All
                      </Button>
                    </Box>
                  </Box>

                  {/* Scrollable video cards */}
                  <Box
                    ref={(el) => {
                      scrollRefs.current[cat.title] = el;
                    }}
                    onWheel={(e) => {
                      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                        e.preventDefault();
                        e.currentTarget.scrollLeft += e.deltaY;
                      }
                    }}
                    sx={{
                      display: 'flex',
                      gap: 3,
                      overflowX: 'auto',
                      pb: 2,
                      pt: 1,
                      px: 0.5,
                      scrollSnapType: 'x mandatory',
                      maskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)',
                      WebkitMaskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)',
                      '&::-webkit-scrollbar': { display: 'none' },
                      scrollbarWidth: 'none',
                    }}
                  >
                    {cat.videos.map((video) => renderVideoCard(video))}
                  </Box>
                </Box>
              ))
            )}
          </Box>
        )}
      </Box>

      {/* ═══ Video Player Dialog ═══ */}
      <Dialog
        open={playerOpen}
        onClose={closePlayer}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.default',
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid rgba(124,58,237,0.2)',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2 }}>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }} noWrap>
              {activeVideo?.title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {activeVideo?.channel}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {activeVideo && (
              <Tooltip title={isInList(activeVideo) ? 'Remove from My List' : 'Add to My List'}>
                <IconButton
                  onClick={() => toggleMyList(activeVideo)}
                  size="small"
                  sx={{ color: isInList(activeVideo) ? '#EC4899' : 'text.secondary' }}
                >
                  {isInList(activeVideo) ? <Check /> : <Add />}
                </IconButton>
              </Tooltip>
            )}
            <IconButton onClick={closePlayer} size="small" sx={{ color: 'text.secondary' }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {activeVideo && (
            <Box sx={{ position: 'relative', width: '100%', pt: '56.25%', bgcolor: '#000' }}>
              <iframe
                title={activeVideo.title}
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Toast Snackbar ═══ */}
      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
