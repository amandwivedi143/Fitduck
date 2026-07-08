import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress,
  Alert, Divider, Collapse, IconButton,
} from '@mui/material';
import { ExpandMore, ExpandLess, Psychology } from '@mui/icons-material';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function RecommendationsPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/recommendation/user/${user.userId}`);
        setRecommendations(res.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    }
    if (user?.userId) load();
  }, [user?.userId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: 'secondary.main' }} />
      </Box>
    );
  }

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        <Psychology sx={{ mr: 1, verticalAlign: 'middle', color: 'secondary.main' }} />
        AI Recommendations
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        AI-powered insights from your workouts.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {recommendations.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary">
              No recommendations yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Log a workout and the AI will analyze it!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        recommendations
          .slice()
          .reverse()
          .map((rec) => (
            <Card key={rec.id} sx={{ mb: 2 }}>
              <CardContent
                sx={{
                  cursor: 'pointer',
                  '&:last-child': { pb: 2 },
                }}
                onClick={() => toggleExpand(rec.id)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="h6" fontWeight={600}>🤖 Analysis</Typography>
                    <Chip
                      label={rec.activityType}
                      size="small"
                      sx={{
                        background: (theme) => theme.palette.gradient?.primary || 'linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)',
                        color: '#fff',
                        fontWeight: 600,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(rec.createdSt)}
                    </Typography>
                  </Box>
                  <IconButton size="small">
                    {expanded[rec.id] ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>

                {/* Summary (always visible) */}
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    color: 'text.secondary',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {rec.recommendation}
                </Typography>

                {/* Expanded details */}
                <Collapse in={expanded[rec.id]}>
                  <Divider sx={{ my: 2, borderColor: 'divider' }} />

                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
                    {rec.recommendation}
                  </Typography>

                  {rec.improvements?.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="warning.main" sx={{ mb: 0.5 }}>
                        📈 Improvements
                      </Typography>
                      {rec.improvements.map((s, i) => (
                        <Typography key={i} variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          • {s}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {rec.suggestions?.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>
                        💡 Suggestions
                      </Typography>
                      {rec.suggestions.map((s, i) => (
                        <Typography key={i} variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          • {s}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {rec.safety?.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'error.main' }}>
                        ⚠️ Safety
                      </Typography>
                      {rec.safety.map((s, i) => (
                        <Typography key={i} variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          • {s}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Collapse>
              </CardContent>
            </Card>
          ))
      )}
    </Box>
  );
}
