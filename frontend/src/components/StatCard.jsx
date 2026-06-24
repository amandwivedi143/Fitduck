import { Box, Typography, Card, CardContent } from '@mui/material';

const iconMap = {
  fire: '🔥',
  run: '🏃',
  clock: '⏱️',
  trophy: '🏆',
  bolt: '⚡',
  heart: '❤️',
};

export default function StatCard({ title, value, subtitle, icon, gradient }) {
  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Gradient accent bar at top */}
      <Box
        sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 4,
          background: gradient || 'linear-gradient(90deg, #7C3AED, #EC4899, #F97316)',
        }}
      />
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" mb={0.5}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" mt={0.5}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Typography sx={{ fontSize: 40, opacity: 0.8 }}>
              {iconMap[icon] || icon}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
