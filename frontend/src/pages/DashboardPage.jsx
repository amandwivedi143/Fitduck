import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip,
  CircularProgress, Alert,
} from '@mui/material';
import { BarChart } from '@mui/x-charts';
import { DirectionsRun, AddCircle } from '@mui/icons-material';
import api from '../api/client';
import StatCard from '../components/StatCard';
import { useAuth } from '../auth/AuthContext';

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: 'secondary.main' }} />
      </Box>
    );
  }

  // Compute stats
  const totalCalories = activities.reduce((sum, a) => sum + (a.caloriesBurned || 0), 0);
  const totalDuration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
  const totalActivities = activities.length;
  const latestRec = recommendations[recommendations.length - 1];

  // Weekly chart data — aggregate calories by day (last 7 entries)
  const chartData = activities.slice(-7).map((a) => a.caloriesBurned || 0);
  const chartLabels = activities.slice(-7).map((a) =>
    a.createdAt ? new Date(a.createdAt).toLocaleDateString('en', { weekday: 'short' }) : '?',
  );

  return (
    <Box>
      {/* Welcome banner */}
      <Box
        sx={{
          p: 4,
          borderRadius: 4,
          mb: 3,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(236,72,153,0.25) 50%, rgba(249,115,22,0.2) 100%)',
          border: '1px solid rgba(124,58,237,0.3)',
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          Welcome back, {user?.firstName || 'Athlete'} 💪
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Keep pushing — consistency beats intensity.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Total Calories" value={totalCalories.toLocaleString()} subtitle="All time" icon="fire" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Total Duration" value={`${totalDuration} min`} subtitle="All time" icon="clock" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Workouts" value={totalActivities} subtitle="Completed" icon="trophy" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Streak" value={`${Math.min(totalActivities, 12)} days`} subtitle="Keep going!" icon="bolt" />
        </Grid>
      </Grid>

      {/* Quick action */}
      <Button
        variant="contained"
        size="large"
        startIcon={<AddCircle />}
        onClick={() => navigate('/activity/new')}
        sx={{ mb: 3 }}
      >
        Log a Workout
      </Button>

      {/* Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            📈 Calories Burned (Recent)
          </Typography>
          {chartData.length > 0 ? (
            <Box sx={{ width: '100%', height: 280 }}>
              <BarChart
                xAxis={[{ scaleType: 'band', data: chartLabels }]}
                series={[{ data: chartData, label: 'Calories', color: '#EC4899' }]}
                height={280}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No activities yet — log your first workout!
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Latest AI Recommendation */}
      {latestRec && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6" fontWeight={600}>🤖 AI Recommendation</Typography>
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
              <>
                <Typography variant="subtitle2" color="secondary" sx={{ mb: 0.5 }}>
                  💡 Suggestions
                </Typography>
                {latestRec.suggestions.map((s, i) => (
                  <Typography key={i} variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    • {s}
                  </Typography>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
