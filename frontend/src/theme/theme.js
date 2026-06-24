import { createTheme } from '@mui/material/styles';

/**
 * Bold gradient palette — purple (#7C3AED) → pink (#EC4899) → orange (#F97316).
 * Dark base for energy and contrast; neon-ish accent pops.
 */
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7C3AED',   // vibrant purple
      light: '#A78BFA',
      dark: '#5B21B6',
    },
    secondary: {
      main: '#EC4899',   // hot pink
      light: '#F472B6',
      dark: '#DB2777',
    },
    warning: {
      main: '#F97316',   // orange
    },
    success: {
      main: '#10B981',
      light: '#34D399',
    },
    info: {
      main: '#3B82F6',
    },
    background: {
      default: '#0F0B1A',
      paper: '#1A1128',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#A1A1AA',
    },
    divider: 'rgba(124,58,237,0.15)',
    gradient: {
      primary: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F97316 100%)',
      card: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(236,72,153,0.15) 100%)',
      hero: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 40%, #F97316 100%)',
      sidebar: 'linear-gradient(180deg, rgba(124,58,237,0.08) 0%, rgba(236,72,153,0.05) 100%)',
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
          background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
          boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5B21B6 0%, #DB2777 100%)',
            boxShadow: '0 6px 25px rgba(124,58,237,0.6)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(26,17,40,0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 20,
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 32px rgba(124,58,237,0.3)',
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
          background: 'rgba(15,11,26,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(124,58,237,0.2)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '& fieldset': {
              borderColor: 'rgba(124,58,237,0.3)',
            },
            '&:hover fieldset': {
              borderColor: '#7C3AED',
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
          backgroundColor: 'rgba(124,58,237,0.1)',
        },
        bar: {
          borderRadius: 8,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(124,58,237,0.15)',
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
  },
});

export default theme;
