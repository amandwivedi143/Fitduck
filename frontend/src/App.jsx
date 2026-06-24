import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './auth/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LogActivityPage from './pages/LogActivityPage';
import ActivityHistoryPage from './pages/ActivityHistoryPage';
import RecommendationsPage from './pages/RecommendationsPage';
import MealPlannerPage from './pages/MealPlannerPage';
import VideosPage from './pages/VideosPage';
import WorkoutGeneratorPage from './pages/WorkoutGeneratorPage';

/**
 * Guard: redirects to /login if the user has no valid session.
 */
function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: 'secondary.main' }} />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/activity/new" element={<LogActivityPage />} />
        <Route path="/activities" element={<ActivityHistoryPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/mealplanner" element={<MealPlannerPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/workoutgenerator" element={<WorkoutGeneratorPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
