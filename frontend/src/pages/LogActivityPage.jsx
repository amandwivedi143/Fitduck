import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, MenuItem, Button, Grid, Card, CardContent,
  Alert, CircularProgress,
} from '@mui/material';
import { FitnessCenter } from '@mui/icons-material';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';

const ACTIVITY_TYPES = ['RUNNING', 'CYCLING', 'JUMPING', 'CARDIO', 'WEIGHTLIFTING'];

export default function LogActivityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: '',
    duration: '',
    caloriesBurned: '',
    heartRate: '',
    distance: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Build the request body. userId is set server-side from the X-User-ID header.
    const body = {
      type: form.type,
      duration: parseInt(form.duration) || null,
      caloriesBurned: parseInt(form.caloriesBurned) || null,
      additionalMetrics: {
        ...(form.heartRate ? { heartRate: parseInt(form.heartRate) } : {}),
        ...(form.distance ? { distance: parseFloat(form.distance) } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      },
    };

    try {
      setLoading(true);
      await api.post('/activity', body);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        <FitnessCenter sx={{ mr: 1, verticalAlign: 'middle', color: 'secondary.main' }} />
        Log Workout
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Record your session and get AI-powered recommendations.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>Workout logged! AI is generating your recommendation...</Alert>}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Activity Type"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  required
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Duration (minutes)"
                  name="duration"
                  value={form.duration}
                  onChange={handleChange}
                  required
                  inputProps={{ min: 1 }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Calories Burned"
                  name="caloriesBurned"
                  value={form.caloriesBurned}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Heart Rate (bpm)"
                  name="heartRate"
                  value={form.heartRate}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Distance (km)"
                  name="distance"
                  value={form.distance}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 0.1 }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="How did the workout feel? Any observations..."
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FitnessCenter />}
                  sx={{ py: 1.5 }}
                >
                  {loading ? 'Saving...' : 'Log Workout'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
