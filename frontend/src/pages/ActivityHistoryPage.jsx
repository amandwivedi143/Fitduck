import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress,
  Alert, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper,
} from '@mui/material';
import { DirectionsRun } from '@mui/icons-material';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';

const typeColors = {
  RUNNING: '#7C3AED',
  CYCLING: '#EC4899',
  JUMPING: '#F97316',
  CARDIO: '#10B981',
  WEIGHTLIFTING: '#3B82F6',
};

const typeIcons = {
  RUNNING: '🏃',
  CYCLING: '🚴',
  JUMPING: '⏫',
  CARDIO: '💪',
  WEIGHTLIFTING: '🏋️',
};

export default function ActivityHistoryPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/activity');
        setActivities(res.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load activities');
      } finally {
        setLoading(false);
      }
    }
    if (user?.userId) load();
  }, [user?.userId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: 'secondary.main' }} />
      </Box>
    );
  }

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        <DirectionsRun sx={{ mr: 1, verticalAlign: 'middle', color: 'secondary.main' }} />
        Activity History
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        All your logged workouts in one place.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {activities.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary">
              No activities yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Log your first workout to see it here!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            background: 'rgba(26,17,40,0.8)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'secondary.main' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'secondary.main' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'secondary.main' }} align="right">Duration</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'secondary.main' }} align="right">Calories</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activities
                .slice()
                .reverse()
                .map((a) => (
                  <TableRow
                    key={a.id}
                    sx={{
                      '&:hover': { background: 'rgba(124,58,237,0.08)' },
                      '&:last-child td': { border: 0 },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{typeIcons[a.type] || '🏋️'}</span>
                        <Chip
                          label={a.type}
                          size="small"
                          sx={{
                            background: `${typeColors[a.type] || '#7C3AED'}22`,
                            color: typeColors[a.type] || '#7C3AED',
                            fontWeight: 600,
                            border: `1px solid ${typeColors[a.type] || '#7C3AED'}44`,
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{formatDate(a.createdAt)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {a.duration ? `${a.duration} min` : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'warning.main' }}>
                      {a.caloriesBurned || 0} kcal
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
