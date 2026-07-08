import { Outlet, useNavigate } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, IconButton, Typography, Avatar,
  InputBase, Paper, useMediaQuery, useTheme, Divider,
  Tooltip,
} from '@mui/material';
import { Search, Notifications, Settings } from '@mui/icons-material';
import Sidebar, { DRAWER_WIDTH, BOTTOM_NAV_HEIGHT } from './Sidebar';
import { useAuth } from '../auth/AuthContext';

export default function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          marginLeft: isDesktop ? 0 : 0,
          width: isDesktop ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
        }}
      >
        {/* Top App Bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
            {/* Search bar — hidden on mobile to avoid squeezing layout */}
            <Paper
              elevation={0}
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                px: 2,
                py: 0.5,
                borderRadius: 8,
                bgcolor: 'rgba(79, 70, 229, 0.04)',
                border: '1px solid rgba(79, 70, 229, 0.1)',
                maxWidth: 360,
                width: '100%',
                '&:focus-within': {
                  borderColor: 'primary.main',
                  bgcolor: 'rgba(79, 70, 229, 0.08)',
                },
              }}
            >
              <Search sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
              <InputBase
                placeholder="Search insights..."
                sx={{ flex: 1, fontSize: '0.875rem', color: 'text.primary' }}
              />
            </Paper>

            {/* If on mobile, show brand title in top bar since sidebar is hidden */}
            {!isDesktop && (
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                FitTrack
              </Typography>
            )}

            {/* Right actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Notifications are not available yet">
                <span>
                  <IconButton size="small" disabled sx={{ color: 'text.secondary' }}>
                    <Notifications fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Settings are not available yet">
                <span>
                  <IconButton size="small" disabled sx={{ color: 'text.secondary' }}>
                    <Settings fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: 'divider' }} />

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  px: 1,
                  py: 0.5,
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'rgba(79, 70, 229, 0.08)' },
                  transition: 'background 0.2s',
                }}
                onClick={handleLogout}
              >
                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
                  {user?.firstName} 💪
                </Typography>
                <Avatar
                  src={user?.pictureUrl}
                  alt={user?.firstName}
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'rgba(79, 70, 229, 0.1)',
                    color: 'primary.main',
                    fontSize: 14,
                    border: '1px solid rgba(79, 70, 229, 0.15)',
                    fontWeight: 700,
                  }}
                >
                  {user?.firstName?.[0] || '?'}
                </Avatar>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 2, sm: 3, md: 4 },
            pb: isDesktop ? 4 : `${BOTTOM_NAV_HEIGHT + 24}px`,
            maxWidth: 1400,
            mx: 'auto',
            width: '100%',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
