import { createTheme } from '@mui/material/styles';

/**
 * Premium Bright Light Theme for FitTrack AI.
 * Vibrant Indigo (#4F46E5) → Pink (#EC4899) → Orange (#F97316).
 * Crisp white and soft slates to feel clean, high-end, and professional.
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4F46E5',   // Indigo
      light: '#818CF8',
      dark: '#3730A3',
    },
    secondary: {
      main: '#EC4899',   // Pink
      light: '#F472B6',
      dark: '#BE185D',
    },
    warning: {
      main: '#F97316',   // Orange
    },
    success: {
      main: '#10B981',
      light: '#34D399',
    },
    info: {
      main: '#3B82F6',
    },
    background: {
      default: '#F8FAFC', // Crisp light slate background
      paper: '#FFFFFF',   // Pure white card / panel backgrounds
    },
    text: {
      primary: '#0F172A',   // Slate-900 for high readability
      secondary: '#475569', // Slate-600 for subtext
    },
    divider: 'rgba(79, 70, 229, 0.08)',
    gradient: {
      primary: 'linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)',
      card: 'linear-gradient(135deg, rgba(79, 70, 229, 0.02) 0%, rgba(236, 72, 153, 0.02) 100%)',
      hero: 'linear-gradient(135deg, #4F46E5 0%, #EC4899 50%, #F97316 100%)',
      sidebar: 'linear-gradient(180deg, rgba(79, 70, 229, 0.03) 0%, rgba(236, 72, 153, 0.02) 100%)',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '0.95rem',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)',
          boxShadow: '0 4px 15px rgba(79, 70, 229, 0.25)',
          color: '#FFFFFF',
          '&:hover': {
            background: 'linear-gradient(135deg, #3730A3 0%, #BE185D 100%)',
            boxShadow: '0 6px 20px rgba(79, 70, 229, 0.35)',
          },
        },
        outlinedPrimary: {
          borderColor: 'rgba(79, 70, 229, 0.3)',
          color: '#4F46E5',
          '&:hover': {
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79, 70, 229, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#FFFFFF',
          border: '1px solid rgba(79, 70, 229, 0.06)',
          borderRadius: 20,
          boxShadow: '0 10px 30px -3px rgba(79, 70, 229, 0.04), 0 4px 12px -2px rgba(79, 70, 229, 0.02)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 40px -4px rgba(79, 70, 229, 0.08), 0 8px 20px -2px rgba(79, 70, 229, 0.04)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(79, 70, 229, 0.06)',
          color: '#0F172A',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            '& fieldset': {
              borderColor: 'rgba(79, 70, 229, 0.15)',
            },
            '&:hover fieldset': {
              borderColor: '#4F46E5',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4F46E5',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#475569',
            '&.Mui-focused': {
              color: '#4F46E5',
            },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 8,
          backgroundColor: 'rgba(79, 70, 229, 0.06)',
        },
        bar: {
          borderRadius: 8,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(79, 70, 229, 0.06)',
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        circle: {
          strokeLinecap: 'round',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.9rem',
          color: '#475569',
          '&.Mui-selected': {
            color: '#4F46E5',
          },
        },
      },
    },
  },
});

export default theme;
