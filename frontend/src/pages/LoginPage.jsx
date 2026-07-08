import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  InputAdornment,
  Link,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccountCircle,
  Email,
  FitnessCenter,
  Lock,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import GoogleAuthButton from '../auth/GoogleAuth';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
};

function getErrorMessage(err, mode) {
  if (err.response?.status === 401) {
    return 'Email or password is wrong.';
  }

  const errors = err.response?.data?.errors;
  if (errors) {
    return Object.values(errors)[0];
  }

  return err.response?.data?.message
    || err.message
    || (mode === 'login' ? 'Could not log in.' : 'Could not create your account.');
}

export default function LoginPage() {
  const { user, loading, login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const getSafeRedirectPath = useCallback(() => {
    const fromState = location.state?.from;
    const fromQuery = new URLSearchParams(location.search).get('redirect');
    const candidate = fromState || fromQuery;
    if (typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//')) {
      return candidate;
    }
    return '/dashboard';
  }, [location.state, location.search]);

  // If already logged in, redirect to dashboard.
  useEffect(() => {
    if (!loading && user) {
      navigate(getSafeRedirectPath(), { replace: true });
    }
  }, [user, loading, navigate, getSafeRedirectPath]);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setForm(initialForm);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
    };

    try {
      if (mode === 'login') {
        await login({ email: payload.email, password: payload.password });
      } else {
        await signup(payload);
      }
      navigate(getSafeRedirectPath(), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, mode));
    } finally {
      setSubmitting(false);
    }
  };

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
        background:
          'linear-gradient(135deg, #EEF2F6 0%, #E0E7FF 50%, #F5F3FF 100%)',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          width: '100%',
          maxWidth: 440,
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(79, 70, 229, 0.12)',
          boxShadow: '0 20px 40px rgba(79, 70, 229, 0.06)',
        }}
      >
        <FitnessCenter sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            mb: 0.5,
            background: 'linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          FitDuck
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {mode === 'login'
            ? 'Welcome back. Log in to continue tracking.'
            : 'Create your account and start tracking today.'}
        </Typography>

        <Tabs
          value={mode}
          onChange={(_, value) => switchMode(value)}
          variant="fullWidth"
          sx={{
            mb: 3,
            minHeight: 44,
            '& .MuiTab-root': { minHeight: 44 },
          }}
        >
          <Tab value="login" label="Login" />
          <Tab value="signup" label="Sign up" />
        </Tabs>

        <Box component="form" onSubmit={submit}>
          <Stack spacing={2}>
            {mode === 'signup' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  name="firstName"
                  label="First name"
                  value={form.firstName}
                  onChange={updateField}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  name="lastName"
                  label="Last name"
                  value={form.lastName}
                  onChange={updateField}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircle fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>
            )}

            <TextField
              name="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={updateField}
              required
              fullWidth
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={updateField}
              required
              inputProps={{ minLength: 6 }}
              fullWidth
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              helperText={mode === 'signup' ? 'Use at least 6 characters.' : ' '}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ py: 1.2, fontWeight: 700 }}
            >
              {submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            sx={{ color: 'secondary.light', fontWeight: 700 }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </Link>
        </Typography>

        <Divider sx={{ my: 3 }}>or</Divider>

        <GoogleAuthButton />

        <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
          By signing in, you agree to our Terms of Service.
        </Typography>
      </Paper>
    </Box>
  );
}
