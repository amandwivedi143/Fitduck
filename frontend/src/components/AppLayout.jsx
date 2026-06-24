import { Outlet, useNavigate } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, IconButton, Typography, Avatar,
  InputBase, Paper, useMediaQuery, useTheme, Divider,
} from '@mui/material';
import { Search, Notifications, Settings, Logout } from '@mui/icons-material';
import Sidebar, { DRAWER_WIDTH, BOTTOM_NAV_HEIGHT } from './Sidebar';
import { useAuth } from '../auth/AuthContext';

export default function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
            bgcolor: 'rgba(15,11,26,0.75)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(124,58,237,0.12)',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
            {/* Search bar */}
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 0.5,
                borderRadius: 8,
                bgcolor: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.15)',
                maxWidth: 360,
                width: '100%',
                '&:focus-within': {
                  borderColor: 'primary.main',
                  bgcolor: 'rgba(124,58,237,0.12)',
                },
              }}
            >
              <Search sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
              <InputBase
                placeholder="Search insights..."
                sx={{ flex: 1, fontSize: '0.875rem', color: 'text.primary' }}
              />
            </Paper>

            {/* Right actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                <Notifications fontSize="small" />
              </IconButton>
              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                <Settings fontSize="small" />
              </IconButton>

              <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: 'rgba(255,255,255,0.08)' }} />

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  px: 1,
                  py: 0.5,
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'rgba(124,58,237,0.1)' },
                  transition: 'background 0.2s',
                }}
                onClick={handleLogout}
              >
                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                  {user?.firstName} 💪
                </Typography>
                <Avatar
                  src={user?.pictureUrl}
                  alt={user?.firstName}
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                    fontSize: 14,
                    border: '1px solid rgba(236,72,153,0.3)',
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
