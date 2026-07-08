import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Avatar, Divider, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Paper, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Restaurant,
  PlayCircle,
  FitnessCenter,
  TrendingUp,
  Forum,
  Person,
  Home,
  SmartToy,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';

const desktopNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Workout Generator', path: '/workoutgenerator', icon: <FitnessCenter /> },
  { label: 'Meal Planner', path: '/mealplanner', icon: <Restaurant /> },
  { label: 'Videos', path: '/videos', icon: <PlayCircle /> },
  { label: 'Activities', path: '/activities', icon: <TrendingUp /> },
  { label: 'AI Coach', path: '/recommendations', icon: <Forum /> },
  { label: 'Profile', path: '/dashboard', icon: <Person /> },
];

const mobileNavItems = [
  { label: 'Home', path: '/dashboard', icon: <Home /> },
  { label: 'Coach', path: '/recommendations', icon: <SmartToy /> },
  { label: 'Workouts', path: '/workoutgenerator', icon: <FitnessCenter /> },
  { label: 'Videos', path: '/videos', icon: <PlayCircle /> },
  { label: 'Profile', path: '/dashboard', icon: <Person /> },
];

const DRAWER_WIDTH = 240;
const BOTTOM_NAV_HEIGHT = 64;

export { DRAWER_WIDTH, BOTTOM_NAV_HEIGHT };

export default function Sidebar() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const navContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: theme.palette.gradient?.sidebar || 'linear-gradient(180deg, rgba(79, 70, 229, 0.03) 0%, rgba(236, 72, 153, 0.02) 100%)',
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 2.5, py: 3, mb: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(135deg, #4F46E5 0%, #EC4899 50%, #F97316 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          FitTrack AI
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
          Elite Performance
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'divider', mx: 2 }} />

      {/* Nav items */}
      <List sx={{ flex: 1, px: 1.5, py: 1, overflow: 'auto' }}>
        {desktopNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.label}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 3,
                mb: 0.5,
                py: 1.2,
                pl: 2,
                borderRight: isActive ? '3px solid' : '3px solid transparent',
                borderColor: isActive ? 'primary.main' : 'transparent',
                color: isActive ? 'primary.main' : 'text.secondary',
                bgcolor: isActive ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                '&:hover': {
                  bgcolor: isActive ? 'rgba(79, 70, 229, 0.08)' : 'rgba(79, 70, 229, 0.03)',
                  color: 'text.primary',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isActive ? 'primary.main' : 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: isActive ? 600 : 500, fontSize: '0.85rem' }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'divider', mx: 2 }} />

      {/* User card */}
      <Box sx={{ px: 2, py: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            borderRadius: 3,
            bgcolor: 'rgba(79, 70, 229, 0.04)',
            border: '1px solid rgba(79, 70, 229, 0.06)',
          }}
        >
          <Avatar
            src={user?.pictureUrl}
            alt={user?.firstName}
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'rgba(79, 70, 229, 0.1)',
              color: 'primary.main',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {user?.firstName?.[0] || '?'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {user?.firstName || 'User'}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Pro Member
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Desktop sidebar */}
      {isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: '4px 0 20px rgba(79, 70, 229, 0.02)',
            },
          }}
        >
          {navContent}
        </Drawer>
      )}

      {/* Mobile bottom nav */}
      {!isDesktop && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: BOTTOM_NAV_HEIGHT,
            zIndex: theme.zIndex.appBar + 1,
            borderRadius: '16px 16px 0 0',
            bgcolor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 -4px 20px rgba(79, 70, 229, 0.05)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              height: '100%',
              px: 1,
            }}
          >
            {mobileNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Box
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.3,
                    cursor: 'pointer',
                    color: isActive ? 'primary.main' : 'text.secondary',
                    transition: 'color 0.2s',
                    '&:hover': { color: 'text.primary' },
                    minWidth: 48,
                  }}
                >
                  {item.icon}
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: isActive ? 600 : 500 }}>
                    {item.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}
    </>
  );
}
