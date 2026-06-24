import { Box, Typography, Card, CardContent } from '@mui/material';

const iconMap = {
  fire: '🔥',
  run: '🏃',
  clock: '⏱️',
  trophy: '🏆',
  bolt: '⚡',
  heart: '❤️',
  charging: '🔋',
};

export default function StatCard({ title, value, subtitle, icon, gradient, sparklineData, trend }) {
  // Normalize sparkline data to 0–100 for bar heights
  const bars = sparklineData && sparklineData.length > 0
    ? sparklineData.map((v) => {
        const max = Math.max(...sparklineData, 1);
        return Math.round((v / max) * 100);
      })
    : null;

  // Determine trend color
  const trendColor = trend
    ? (trend.startsWith('+') || trend.startsWith('On Track') || trend.startsWith('New Record')
        ? 'success.main'
        : trend.startsWith('-')
          ? 'error.main'
          : 'secondary.main')
    : 'secondary.main';

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 32px rgba(124,58,237,0.2)',
        },
      }}
    >
      {/* Gradient accent bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 4,
          background: gradient || 'linear-gradient(90deg, #7C3AED, #EC4899, #F97316)',
        }}
      />
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(124,58,237,0.12)',
              border: '1px solid rgba(124,58,237,0.2)',
            }}
          >
            <Typography sx={{ fontSize: 22 }}>{iconMap[icon] || icon || '📊'}</Typography>
          </Box>
          {trend && (
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: trendColor }}>
              {trend}
            </Typography>
          )}
        </Box>

        {/* Value */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1, mb: 1 }}>
          {value}
        </Typography>

        {/* Sparkline bars */}
        {bars && (
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.3, height: 40 }}>
            {bars.map((h, i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  height: `${h}%`,
                  minWidth: 4,
                  borderRadius: 1,
                  background: i === bars.length - 1
                    ? 'linear-gradient(180deg, #EC4899, #F472B6)'
                    : `rgba(236,72,153,${0.15 + (i / bars.length) * 0.3})`,
                  transition: 'height 0.3s',
                }}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
