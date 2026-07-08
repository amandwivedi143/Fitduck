import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip,
  CircularProgress, Alert, LinearProgress, Avatar,
} from '@mui/material';
import { PieChart, LineChart } from '@mui/x-charts';
import {
  AddCircle, TrendingUp, Bedtime, Psychology,
  FitnessCenter, DirectionsRun, ChevronRight,
} from '@mui/icons-material';
import api from '../api/client';
import StatCard from '../components/StatCard';
import { useAuth } from '../auth/AuthContext';

// ─── Type config ───────────────────────────────────────────────
const typeColors = {
  RUNNING: '#7C3AED',
  CYCLING: '#EC4899',
  JUMPING: '#F97316',
  CARDIO: '#10B981',
  WEIGHTLIFTING: '#3B82F6',
};
const typeIcons = { RUNNING: '🏃', CYCLING: '🚴', JUMPING: '⏫', CARDIO: '💪', WEIGHTLIFTING: '🏋️' };
const typeLabels = { RUNNING: 'Running', CYCLING: 'Cycling', JUMPING: 'Jumping', CARDIO: 'Cardio', WEIGHTLIFTING: 'Weightlifting' };

// ─── Utility helpers ──────────────────────────────────────────

/** Get a Date-only string (YYYY-MM-DD) from a date string or Date. */
function toDateKey(d) {
  if (!d) return null;
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

/** Check if a date falls within the last N days from today. */
function withinDays(dateStr, days) {
  if (!dateStr) return false;
  const now = new Date();
  const then = new Date(dateStr);
  const diff = (now - then) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff < days;
}

/** Get the start of the week (Monday) for a given date. */
function getMonday(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Human-readable relative time. */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Format a date nicely. */
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

// ─── Data computation ─────────────────────────────────────────

function computeMetrics(activities) {
  const now = new Date();
  const monday = getMonday(now);
  const prevMonday = new Date(monday);
  prevMonday.setDate(prevMonday.getDate() - 7);

  // Filter activities by week
  const thisWeek = activities.filter((a) => new Date(a.createdAt) >= monday);
  const lastWeek = activities.filter((a) => {
    const d = new Date(a.createdAt);
    return d >= prevMonday && d < monday;
  });

  // Weekly calories
  const weekCalories = thisWeek.reduce((s, a) => s + (a.caloriesBurned || 0), 0);
  const lastWeekCalories = lastWeek.reduce((s, a) => s + (a.caloriesBurned || 0), 0);
  const calorieChange = lastWeekCalories > 0
    ? Math.round(((weekCalories - lastWeekCalories) / lastWeekCalories) * 100)
    : 0;

  // Weekly active minutes
  const weekMinutes = thisWeek.reduce((s, a) => s + (a.duration || 0), 0);
  const lastWeekMinutes = lastWeek.reduce((s, a) => s + (a.duration || 0), 0);
  const minutesOnTrack = weekMinutes >= lastWeekMinutes || lastWeekMinutes === 0;

  // Real streak (consecutive days with activity counting backwards from today)
  const daySet = new Set(
    activities.filter((a) => a.createdAt).map((a) => toDateKey(a.createdAt)).filter(Boolean),
  );
  let streak = 0;
  const check = new Date(now);
  // If today has no activity, start from yesterday
  if (!daySet.has(toDateKey(check))) {
    check.setDate(check.getDate() - 1);
  }
  while (daySet.has(toDateKey(check))) {
    streak++;
    check.setDate(check.getDate() - 1);
  }

  // Recovery score: inversely related to recent intensity
  // Higher avg calories/day this week → lower recovery
  const daysInWeek = Math.max(new Set(thisWeek.map((a) => toDateKey(a.createdAt))).size, 1);
  const avgIntensity = weekCalories / daysInWeek;
  const recoveryScore = Math.max(0, Math.min(100, Math.round(100 - avgIntensity * 0.5)));

  // Daily data for sparklines (last 7 days)
  const dailyCalories = [];
  const dailyMinutes = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    const key = toDateKey(day);
    const dayActs = activities.filter((a) => toDateKey(a.createdAt) === key);
    dailyCalories.push(dayActs.reduce((s, a) => s + (a.caloriesBurned || 0), 0));
    dailyMinutes.push(dayActs.reduce((s, a) => s + (a.duration || 0), 0));
  }

  // AI Fitness Score (0-100)
  // Consistency: how many days this week had activity (out of 7)
  const consistency = Math.min(1, daysInWeek / 5);
  // Intensity: avg calories per session (scale: 0-500 → 0-1)
  const weekSessions = thisWeek.length || 1;
  const avgCalPerSession = weekCalories / weekSessions;
  const intensity = Math.min(1, avgCalPerSession / 400);
  // Volume: weekly minutes (scale: 0-300 → 0-1)
  const volume = Math.min(1, weekMinutes / 300);
  const fitnessScore = Math.round((consistency * 0.4 + intensity * 0.3 + volume * 0.3) * 100);

  // Workout distribution
  const typeCounts = {};
  activities.forEach((a) => {
    if (a.type) typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
  });
  const totalTypeCount = Object.values(typeCounts).reduce((s, c) => s + c, 0) || 1;

  // Weekly line chart data (Mon-Sun)
  const chartDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartCalories = [];
  const chartDuration = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(day.getDate() + i);
    const key = toDateKey(day);
    const dayActs = activities.filter((a) => toDateKey(a.createdAt) === key);
    chartCalories.push(dayActs.reduce((s, a) => s + (a.caloriesBurned || 0), 0));
    chartDuration.push(dayActs.reduce((s, a) => s + (a.duration || 0), 0));
  }

  // Intensity trend
  const intensityUp = weekCalories > lastWeekCalories;
  const intensityPct = lastWeekCalories > 0
    ? Math.abs(Math.round(((weekCalories - lastWeekCalories) / lastWeekCalories) * 100))
    : weekCalories > 0 ? 100 : 0;

  // Rest advisory: consecutive high-intensity days (≥400 cal each)
  let consecutiveHigh = 0;
  const checkDay = new Date(now);
  if (!daySet.has(toDateKey(checkDay))) checkDay.setDate(checkDay.getDate() - 1);
  while (true) {
    const key = toDateKey(checkDay);
    const dayCals = activities
      .filter((a) => toDateKey(a.createdAt) === key)
      .reduce((s, a) => s + (a.caloriesBurned || 0), 0);
    if (dayCals >= 400) { consecutiveHigh++; checkDay.setDate(checkDay.getDate() - 1); }
    else break;
  }
  const needsRest = consecutiveHigh >= 3;

  return {
    weekCalories,
    lastWeekCalories,
    calorieChange,
    weekMinutes,
    lastWeekMinutes,
    minutesOnTrack,
    streak,
    recoveryScore,
    dailyCalories,
    dailyMinutes,
    fitnessScore,
    consistency,
    intensity,
    volume,
    typeCounts,
    totalTypeCount,
    chartDays,
    chartCalories,
    chartDuration,
    intensityUp,
    intensityPct,
    needsRest,
    consecutiveHigh,
    thisWeekCount: thisWeek.length,
  };
}

// ─── Component ───────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [actRes, recRes] = await Promise.all([
          api.get('/activity'),
          api.get(`/recommendation/user/${user.userId}`),
        ]);
        setActivities(actRes.data || []);
        setRecommendations(recRes.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    if (user?.userId) loadData();
  }, [user?.userId]);

  const m = useMemo(() => computeMetrics(activities), [activities]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: 'secondary.main' }} />
      </Box>
    );
  }

  const latestRec = recommendations.length > 0 ? recommendations[recommendations.length - 1] : null;
  const recentActivities = [...activities].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* ═══ A. Hero Banner ═══ */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(236,72,153,0.15) 50%, rgba(249,115,22,0.1) 100%)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
          '&:hover': { transform: 'none', boxShadow: '0 0 40px rgba(124,58,237,0.15)' },
        }}
      >
        {/* Decorative blurs */}
        <Box sx={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(236,72,153,0.12)', filter: 'blur(60px)' }} />
        <Box sx={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(124,58,237,0.12)', filter: 'blur(60px)' }} />

        <CardContent sx={{ p: { xs: 3, md: 5 }, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            {/* Left: text */}
            <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                Welcome Back,{' '}
                <Box component="span" sx={{ background: 'linear-gradient(135deg, #A78BFA, #F472B6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {user?.firstName || 'Athlete'} 💪
                </Box>
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
                {m.recoveryScore >= 70
                  ? <>Your system is primed for a high-intensity session. Recovery is at <Box component="span" fontWeight={700} color="secondary.main">{m.recoveryScore}%</Box>.</>
                  : <>Recovery is at <Box component="span" fontWeight={700} color="warning.main">{m.recoveryScore}%</Box> — consider a lighter session today.</>}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddCircle />}
                  onClick={() => navigate('/activity/new')}
                  sx={{ background: 'linear-gradient(135deg, #EC4899, #7C3AED)', '&:hover': { background: 'linear-gradient(135deg, #DB2777, #5B21B6)' } }}
                >
                  Log a Workout
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/activities')}
                  sx={{ borderColor: 'rgba(79, 70, 229, 0.3)', color: 'text.primary', '&:hover': { borderColor: 'rgba(79, 70, 229, 0.5)', bgcolor: 'rgba(79, 70, 229, 0.04)' } }}
                >
                  View Schedule
                </Button>
              </Box>
            </Box>

            {/* Right: readiness gauge */}
            <Box sx={{ width: { xs: 140, md: 180 }, height: { xs: 140, md: 180 }, flexShrink: 0 }}>
              <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress
                  variant="determinate"
                  value={m.recoveryScore}
                  size="100%"
                  thickness={6}
                  sx={{
                    position: 'absolute',
                    color: m.recoveryScore >= 70 ? '#EC4899' : '#F97316',
                    '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                  }}
                />
                <Box sx={{ position: 'relative', textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={900} sx={{ lineHeight: 1 }}>
                    {m.recoveryScore}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Ready
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ═══ B. Stat Cards ═══ */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Calories Burned"
            value={m.weekCalories.toLocaleString()}
            subtitle="This week"
            icon="fire"
            sparklineData={m.dailyCalories}
            trend={m.calorieChange !== 0 ? `${m.calorieChange > 0 ? '+' : ''}${m.calorieChange}% vs last week` : 'No prior data'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Active Minutes"
            value={m.weekMinutes}
            subtitle="This week"
            icon="clock"
            sparklineData={m.dailyMinutes}
            trend={m.minutesOnTrack ? 'On Track' : `${Math.round(((m.weekMinutes - m.lastWeekMinutes) / Math.max(m.lastWeekMinutes, 1)) * 100)}% vs last week`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Workout Streak"
            value={`${m.streak} Days`}
            subtitle={m.streak >= 7 ? 'On fire!' : m.streak >= 3 ? 'Keep going!' : 'Start your streak'}
            icon="bolt"
            sparklineData={m.dailyCalories.map((_, i) => (i >= 7 - m.streak ? 100 : 15))}
            trend={m.streak >= 5 ? '🔥 Streak!' : ''}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Recovery Score"
            value={`${m.recoveryScore}%`}
            subtitle={m.recoveryScore >= 70 ? 'Well rested' : 'Needs recovery'}
            icon="charging"
            sparklineData={Array.from({ length: 7 }, (_, i) => Math.max(50, m.recoveryScore + (i - 3) * 3))}
            trend={`${m.recoveryScore >= 70 ? '+' : ''}${m.recoveryScore - 70}% vs baseline`}
          />
        </Grid>
      </Grid>

      {/* ═══ C + D: Weekly Chart + AI Insights (2-column) ═══ */}
      <Grid container spacing={3}>
        {/* Left: Weekly Activity Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>Weekly Activity</Typography>
                  <Typography variant="body2" color="text.secondary">Comparative performance analysis</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#EC4899' }} />
                    <Typography variant="caption" color="text.secondary">Calories</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#A78BFA' }} />
                    <Typography variant="caption" color="text.secondary">Minutes</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ width: '100%', height: 280 }}>
                <LineChart
                  xAxis={[{ scaleType: 'band', data: m.chartDays }]}
                  series={[
                    { data: m.chartCalories, color: '#EC4899', label: 'Calories', area: true },
                    { data: m.chartDuration, color: '#A78BFA', label: 'Minutes', area: true },
                  ]}
                  height={280}
                  grid={{ vertical: true, horizontal: true }}
                  sx={{
                    '& .MuiChartsAxis-tickContainer': { display: 'none' },
                    '& .MuiChartsAxis-line': { display: 'none' },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: AI Fitness Score */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CardContent sx={{ p: 3, textAlign: 'center', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>AI Fitness Score</Typography>

              {/* Circular gauge */}
              <Box sx={{ position: 'relative', width: 160, height: 160, mb: 3 }}>
                <CircularProgress
                  variant="determinate"
                  value={m.fitnessScore}
                  size={160}
                  thickness={8}
                  sx={{
                    color: 'secondary.main',
                    '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                  }}
                />
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h3" fontWeight={900} sx={{ lineHeight: 1 }}>{m.fitnessScore}</Typography>
                  <Typography variant="caption" color="text.secondary">out of 100</Typography>
                </Box>
              </Box>

              {/* Sub-metrics */}
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { label: 'Consistency', value: m.consistency, color: 'secondary.main' },
                  { label: 'Intensity', value: m.intensity, color: 'primary.light' },
                  { label: 'Volume', value: m.volume, color: 'warning.main' },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                    <Chip
                      label={item.value >= 0.7 ? 'Excellent' : item.value >= 0.4 ? 'Good' : 'Fair'}
                      size="small"
                      sx={{
                        bgcolor: `${item.color}20`,
                        color: item.color,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </Box>
                ))}
              </Box>

              <Button
                size="small"
                endIcon={<ChevronRight />}
                sx={{ mt: 'auto', pt: 3, color: 'secondary.main' }}
                onClick={() => navigate('/recommendations')}
              >
                Deep Analysis
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ═══ E. AI Insights ═══ */}
      <Box>
        <Typography variant="h6" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Psychology sx={{ color: 'secondary.main' }} />
          AI Insights
        </Typography>
        <Grid container spacing={2}>
          {/* Intensity Trend */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card
              sx={{
                borderLeft: '4px solid',
                borderColor: 'secondary.main',
                '&:hover': { transform: 'scale(1.01)' },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(236,72,153,0.12)', color: 'secondary.main' }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography fontWeight={700}>Intensity {m.intensityUp ? 'Spike' : 'Drop'}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {m.intensityUp
                      ? `You trained ${m.intensityPct}% more this week compared to your average baseline. Your aerobic capacity is improving.`
                      : `Training volume is ${m.intensityPct}% lower than last week. Consider adding an extra session to maintain progress.`}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Rest Advisory */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card
              sx={{
                borderLeft: '4px solid',
                borderColor: m.needsRest ? 'warning.main' : 'primary.light',
                '&:hover': { transform: 'scale(1.01)' },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar sx={{ bgcolor: m.needsRest ? 'rgba(249,115,22,0.12)' : 'rgba(167,139,250,0.12)', color: m.needsRest ? 'warning.main' : 'primary.light' }}>
                  <Bedtime />
                </Avatar>
                <Box>
                  <Typography fontWeight={700}>Rest Advisory</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {m.needsRest
                      ? `${m.consecutiveHigh} consecutive high-intensity days detected — consider a light mobility session or complete rest day.`
                      : 'Your training load is well-balanced. Keep maintaining your current schedule.'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* ═══ F. Goals + G/H: Timeline + Distribution (3-column) ═══ */}
      <Grid container spacing={3}>
        {/* Left: Recent Activities Timeline */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>Recent Activities</Typography>
                <Button size="small" sx={{ color: 'text.secondary' }} onClick={() => navigate('/activities')}>
                  View All
                </Button>
              </Box>

              {recentActivities.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No activities yet — log your first workout!
                </Typography>
              ) : (
                <Box sx={{ position: 'relative', pl: 5 }}>
                  {/* Timeline line */}
                  <Box sx={{ position: 'absolute', left: 16, top: 8, bottom: 8, width: 2, bgcolor: 'rgba(124,58,237,0.2)', borderRadius: 1 }} />

                  {recentActivities.map((act) => (
                    <Box
                      key={act.id}
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        py: 1.5,
                        cursor: 'pointer',
                        '&:hover': { '& .chevron-icon': { opacity: 1 } },
                      }}
                    >
                      {/* Timeline dot */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: -20,
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: `${typeColors[act.type] || '#7C3AED'}20`,
                          border: `2px solid ${typeColors[act.type] || '#7C3AED'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          zIndex: 1,
                        }}
                      >
                        {typeIcons[act.type] || '🏋️'}
                      </Box>

                      {/* Content */}
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{typeLabels[act.type] || act.type} Session</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {act.duration ? `${act.duration} min` : ''} {act.caloriesBurned ? `• ${act.caloriesBurned} kcal` : ''}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">{timeAgo(act.createdAt)}</Typography>
                        </Box>
                      </Box>

                      <ChevronRight sx={{ fontSize: 18, color: 'text.secondary', opacity: 0 }} className="chevron-icon" />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Middle: Goals */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>Upcoming Goals</Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Active Minutes Goal */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={500}>Active Min (300/wk)</Typography>
                    <Typography variant="body2" fontWeight={700} color="secondary.main">
                      {Math.min(100, Math.round((m.weekMinutes / 300) * 100))}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (m.weekMinutes / 300) * 100)}
                    sx={{
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #EC4899, #7C3AED)',
                      },
                    }}
                  />
                </Box>

                {/* Workout Frequency Goal */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={500}>Workouts (5/wk)</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.light">
                      {Math.min(100, Math.round((m.thisWeekCount / 5) * 100))}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (m.thisWeekCount / 5) * 100)}
                    sx={{
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #A78BFA, #F472B6)',
                      },
                    }}
                  />
                </Box>

                {/* Calorie Goal */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={500}>Calories (3000/wk)</Typography>
                    <Typography variant="body2" fontWeight={700} color="warning.main">
                      {Math.min(100, Math.round((m.weekCalories / 3000) * 100))}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (m.weekCalories / 3000) * 100)}
                    sx={{
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #F97316, #EC4899)',
                      },
                    }}
                  />
                </Box>
              </Box>

              <Button
                fullWidth
                variant="outlined"
                disabled
                sx={{ mt: 3, borderColor: 'rgba(255,255,255,0.1)', color: 'text.primary' }}
              >
                Manage Goals
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Workout Distribution */}
        <Grid size={{ xs: 12, lg: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>Workout Distribution</Typography>

              {Object.keys(m.typeCounts).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                  No data yet
                </Typography>
              ) : (
                <>
                  <Box sx={{ width: 160, height: 160, mx: 'auto', mb: 3 }}>
                    <PieChart
                      width={160}
                      height={160}
                      series={[
                        {
                          innerRadius: 50,
                          data: Object.entries(m.typeCounts).map(([type, count]) => ({
                            id: type,
                            value: count,
                            label: `${Math.round((count / m.totalTypeCount) * 100)}%`,
                            color: typeColors[type] || '#7C3AED',
                          })),
                        },
                      ]}
                      sx={{
                        '& .MuiChartsLegend-root': { display: 'none' },
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, textAlign: 'left' }}>
                    {Object.entries(m.typeCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => (
                        <Box key={type} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: typeColors[type] || '#7C3AED' }} />
                            <Typography variant="body2">{typeLabels[type] || type}</Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={700}>
                            {Math.round((count / m.totalTypeCount) * 100)}%
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ═══ Latest AI Recommendation ═══ */}
      {latestRec && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>🤖 Latest AI Recommendation</Typography>
              <Chip
                label={latestRec.activityType}
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                  color: '#fff',
                  fontWeight: 600,
                }}
              />
            </Box>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
              {latestRec.recommendation}
            </Typography>
            {latestRec.suggestions?.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {latestRec.suggestions.map((s, i) => (
                  <Chip key={i} label={s} size="small" variant="outlined" sx={{ borderColor: 'rgba(124,58,237,0.3)', color: 'text.secondary' }} />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
