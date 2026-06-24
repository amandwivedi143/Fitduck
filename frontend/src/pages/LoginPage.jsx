import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Container, Paper, CircularProgress,
} from '@mui/material';
import { FitnessCenter } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import GoogleAuthButton from '../auth/GoogleAuth';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard.
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: 'secondary.main' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 40%, #F97316 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative blobs */}
      <Box
        sx={{
          position: 'absolute',
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'rgba(124,58,237,0.3)',
          top: -100, right: -100,
          filter: 'blur(80px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 350, height: 350,
          borderRadius: '50%',
          background: 'rgba(249,115,22,0.3)',
          bottom: -80, left: -80,
          filter: 'blur(80px)',
        }}
      />

      <Paper
        elevation={0}
        sx={{
          p: 5,
          borderRadius: 6,
          width: 420,
          textAlign: 'center',
          background: 'rgba(15,11,26,0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(124,58,237,0.3)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <FitnessCenter sx={{ fontSize: 56, color: 'secondary.main', mb: 1 }} />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            mb: 0.5,
            background: 'linear-gradient(135deg, #7C3AED, #EC4899, #F97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          FitTrack
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Track your workouts. Get AI-powered insights. Crush your goals.
        </Typography>

        <GoogleAuthButton />

        <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
          By signing in, you agree to our Terms of Service.
        </Typography>
      </Paper>
    </Box>
  );
}
