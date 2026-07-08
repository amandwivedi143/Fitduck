import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Menu, MenuItem,
  Avatar, Box, Divider, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  FitnessCenter, Logout, Dashboard, History, Recommend,
  AddCircle,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
  { label: 'Log Activity', path: '/activity/new', icon: <AddCircle /> },
  { label: 'History', path: '/activities', icon: <History /> },
  { label: 'Recommendations', path: '/recommendations', icon: <Recommend /> },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  return (
    <AppBar position="sticky" elevation={0} sx={{ mb: 3 }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Brand */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}
        >
          <FitnessCenter sx={{ fontSize: 32, color: 'secondary.main' }} />
          <Typography
            variant="h6"
            sx={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 800,
            }}
          >
            FitDuck
          </Typography>
        </Box>

        {/* Nav links (desktop) */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          {navItems.map((item) => (
            <Box
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                cursor: 'pointer',
                fontWeight: location.pathname === item.path ? 700 : 400,
                color: location.pathname === item.path ? 'secondary.main' : 'text.secondary',
                backgroundColor: location.pathname === item.path ? 'rgba(124,58,237,0.1)' : 'transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(124,58,237,0.15)',
                  color: 'text.primary',
                },
              }}
            >
              {item.label}
            </Box>
          ))}
        </Box>

        {/* User avatar + dropdown */}
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Avatar
            src={user?.pictureUrl}
            alt={user?.firstName}
            sx={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              fontSize: 14,
            }}
          >
            {user?.firstName?.[0] || '?'}
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: {
              mt: 1.5,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(79, 70, 229, 0.1)',
              borderRadius: 3,
              minWidth: 200,
              boxShadow: '0 10px 30px rgba(79, 70, 229, 0.08)',
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} color="text.primary">
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <Divider sx={{ my: 1, borderColor: 'divider' }} />

          {/* Mobile nav items */}
          {navItems.map((item) => (
            <MenuItem
              key={item.path}
              onClick={() => { navigate(item.path); setAnchorEl(null); }}
              sx={{
                borderRadius: 2,
                mx: 1,
                color: 'text.primary',
                '&:hover': { backgroundColor: 'rgba(79, 70, 229, 0.05)' },
              }}
            >
              <ListItemIcon sx={{ color: 'text.secondary' }}>{item.icon}</ListItemIcon>
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
          ))}

          <Divider sx={{ my: 1, borderColor: 'divider' }} />
          <MenuItem
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              mx: 1,
              '&:hover': { backgroundColor: 'rgba(239,68,68,0.08)' },
              color: 'error.main',
            }}
          >
            <ListItemIcon><Logout fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
