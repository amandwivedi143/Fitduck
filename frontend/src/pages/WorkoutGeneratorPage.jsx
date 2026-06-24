import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  MenuItem, CircularProgress, Alert, Chip,
  IconButton, Divider, Snackbar,
} from '@mui/material';
import {
  Psychology, Print, AccessTime,
  Close, FitnessCenter, Timer,
  LocalFireDepartment, Repeat,
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';

// ─── Constants ────────────────────────────────────────────────
const GOALS = [
  { value: 'MUSCLE_GAIN', label: 'Muscle Gain' },
  { value: 'WEIGHT_LOSS', label: 'Weight Loss' },
  { value: 'ENDURANCE', label: 'Endurance' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'GENERAL_FITNESS', label: 'General Fitness' },
];

const EXPERIENCE_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const LOCATIONS = [
  { value: 'COMMERCIAL_GYM', label: 'Commercial Gym' },
  { value: 'HOME_GYM', label: 'Home Gym' },
  { value: 'BODYWEIGHT', label: 'Bodyweight Only' },
  { value: 'OUTDOOR', label: 'Outdoor' },
];

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const EQUIPMENT_OPTIONS = [
  'Barbell', 'Dumbbells', 'Cable Machine', 'Kettlebell', 'Resistance Bands',
  'Pull-Up Bar', 'Bench', 'Squat Rack', 'Lat Pulldown', 'Leg Press',
  'Treadmill', 'Rowing Machine', 'Stationary Bike', 'Elliptical',
  'Medicine Ball', 'Foam Roller', 'Jump Rope', 'Box',
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MUSCLE_COLORS = {
  Chest: '#F97316',
  Back: '#3B82F6',
  Shoulders: '#A78BFA',
  Biceps: '#EC4899',
  Triceps: '#F472B6',
  Quads: '#10B981',
  Hamstrings: '#14B8A6',
  Glutes: '#8B5CF6',
  Calves: '#06B6D4',
  Core: '#EAB308',
  Abs: '#EAB308',
  Forearms: '#D97706',
  Traps: '#6366F1',
  'Full Body': '#7C3AED',
  General: '#A1A1AA',
};

// ─── Component ──────────────────────────────────────────────────

export default function WorkoutGeneratorPage() {
  const { user } = useAuth();
  const pollRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    age: '',
    weight: '',
    height: '',
    goal: 'GENERAL_FITNESS',
    gender: '',
    experienceLevel: 'INTERMEDIATE',
    location: 'COMMERCIAL_GYM',
    equipment: ['Barbell', 'Dumbbells', 'Bench'],
    days: 3,
    durationInMinutes: 60,
    suggestion: '',
  });

  // Plan state
  const [currentPlan, setCurrentPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Toast state
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ['age', 'weight', 'height', 'days', 'durationInMinutes'].includes(name)
        ? (value === '' ? '' : Number(value))
        : value,
    }));
  };

  const handleEquipmentToggle = (equipmentName) => {
    setForm((prev) => {
      const current = prev.equipment || [];
      if (current.includes(equipmentName)) {
        return { ...prev, equipment: current.filter((e) => e !== equipmentName) };
      }
      return { ...prev, equipment: [...current, equipmentName] };
    });
  };

  // Polling logic — polls the plan until it's COMPLETED or FAILED
  const startPolling = useCallback((planId) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/workoutplan/${planId}`);
        const plan = res.data;
        setCurrentPlan(plan);

        if (plan.status === 'COMPLETED' || plan.status === 'FAILED') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setGenerating(false);
          if (plan.status === 'COMPLETED' && plan.workoutDays?.length > 0) {
            setSelectedDay(0);
          }
        }
      } catch {
        // ignore poll errors
      }
    }, 2000);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Load user's latest plan on mount
  useEffect(() => {
    async function loadLatest() {
      try {
        const res = await api.get(`/workoutplan/user/${user.userId}`);
        const plans = res.data || [];
        const latest = plans.length > 0 ? plans[0] : null;
        if (latest && (latest.status === 'COMPLETED' || latest.status === 'PENDING')) {
          setCurrentPlan(latest);
          if (latest.status === 'PENDING') {
            setGenerating(true);
            startPolling(latest.id);
          } else if (latest.workoutDays?.length > 0) {
            setSelectedDay(0);
          }
        }
      } catch {
        // No plans yet — fine
      }
    }
    if (user?.userId) loadLatest();
  }, [user?.userId]);

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    setCurrentPlan(null);

    try {
      const body = {
        age: form.age || null,
        weight: form.weight || null,
        height: form.height || null,
        goal: form.goal,
        gender: form.gender || null,
        experienceLevel: form.experienceLevel,
        location: form.location,
        equipment: form.equipment,
        days: form.days,
        durationInMinutes: form.durationInMinutes || null,
        suggestion: form.suggestion || null,
      };
      const res = await api.post('/workoutplan', body);
      const plan = res.data;
      setCurrentPlan(plan);
      startPolling(plan.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate workout plan');
      setGenerating(false);
    }
  };

  // ─── Export PDF ────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!currentPlan?.workoutDays) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Workout Plan', 105, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(
      `Goal: ${currentPlan.goal}  |  Level: ${currentPlan.experienceLevel}  |  Location: ${currentPlan.location}`,
      105, 26, { align: 'center' },
    );
    if (currentPlan.durationInMinutes) {
      doc.text(`Target Duration: ${currentPlan.durationInMinutes} min/session`, 105, 32, { align: 'center' });
    }
    doc.setTextColor(0);

    currentPlan.workoutDays.forEach((day, dayIdx) => {
      if (dayIdx > 0) doc.addPage();

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22); // orange accent
      doc.text(`Day ${day.dayNumber} — ${day.dayTitle || DAY_LABELS[dayIdx % 7]}`, 14, dayIdx > 0 ? 20 : 40);
      doc.setTextColor(0);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(
        `${day.totalSets || 0} sets  |  ~${day.totalDurationMinutes || 0} min  |  ~${day.estimatedCalories || 0} kcal`,
        14, dayIdx > 0 ? 26 : 46,
      );
      doc.setTextColor(0);

      const tableBody = day.exercises.map((ex, idx) => [
        idx + 1,
        ex.exerciseName,
        ex.muscleGroup,
        ex.sets,
        ex.reps,
        `${ex.restSeconds || 60}s`,
        ex.rpe || '-',
        `${ex.estimatedCalories || 0}`,
        ex.notes || '',
      ]);

      autoTable(doc, {
        startY: dayIdx > 0 ? 30 : 50,
        head: [['#', 'Exercise', 'Muscle', 'Sets', 'Reps', 'Rest', 'RPE', 'Cal', 'Notes']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 38 },
          2: { cellWidth: 22 },
          3: { cellWidth: 12, halign: 'center' },
          4: { cellWidth: 14, halign: 'center' },
          5: { cellWidth: 12, halign: 'center' },
          6: { cellWidth: 10, halign: 'center' },
          7: { cellWidth: 10, halign: 'right' },
        },
        alternateRowStyles: { fillColor: [255, 247, 237] },
        margin: { left: 14, right: 14 },
      });
    });

    doc.save(`workout-plan-${currentPlan.goal?.toLowerCase() || 'plan'}-${Date.now()}.pdf`);
    showToast('PDF exported successfully!');
  };

  // ─── Derived data for the selected day ───
  const activeDay = currentPlan?.workoutDays?.[selectedDay] || null;
  const dayExercises = activeDay?.exercises || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* ═══ Page Header ═══ */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Workout Generator</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: 600 }}>
            Build a personalized, AI-driven workout plan tailored to your goals, equipment, and experience level.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* ═══ LEFT: AI Configuration Form ═══ */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Psychology sx={{ color: 'warning.main' }} />
                <Typography variant="h6" fontWeight={600}>AI Configuration</Typography>
              </Box>

              <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField fullWidth label="Age" name="age" type="number" value={form.age} onChange={handleChange} inputProps={{ min: 10, max: 100 }} />
                  </Grid>
                  <Grid size={6}>
                    <TextField fullWidth label="Weight (kg)" name="weight" type="number" value={form.weight} onChange={handleChange} inputProps={{ min: 30, max: 300 }} />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField fullWidth label="Height (cm)" name="height" type="number" value={form.height} onChange={handleChange} inputProps={{ min: 100, max: 250 }} />
                  </Grid>
                  <Grid size={6}>
                    <TextField select fullWidth label="Gender" name="gender" value={form.gender} onChange={handleChange}>
                      {GENDERS.map((g) => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                </Grid>

                <TextField select fullWidth label="Primary Goal" name="goal" value={form.goal} onChange={handleChange}>
                  {GOALS.map((g) => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
                </TextField>

                <TextField select fullWidth label="Experience Level" name="experienceLevel" value={form.experienceLevel} onChange={handleChange}>
                  {EXPERIENCE_LEVELS.map((e) => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
                </TextField>

                <TextField select fullWidth label="Workout Location" name="location" value={form.location} onChange={handleChange}>
                  {LOCATIONS.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
                </TextField>

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField select fullWidth label="Plan Duration" name="days" value={form.days} onChange={handleChange}>
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => <MenuItem key={d} value={d}>{d} Day{d > 1 ? 's' : ''}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={6}>
                    <TextField fullWidth label="Session (min)" name="durationInMinutes" type="number" value={form.durationInMinutes} onChange={handleChange} inputProps={{ min: 15, max: 180 }} />
                  </Grid>
                </Grid>

                <Divider sx={{ borderColor: 'rgba(249,115,22,0.15)' }} />
                <Typography variant="subtitle2" color="text.secondary">Equipment (click to toggle)</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {EQUIPMENT_OPTIONS.map((eq) => {
                    const selected = form.equipment.includes(eq);
                    return (
                      <Chip
                        key={eq}
                        label={eq}
                        size="small"
                        variant={selected ? 'filled' : 'outlined'}
                        onClick={() => handleEquipmentToggle(eq)}
                        sx={{
                          bgcolor: selected ? 'rgba(249,115,22,0.15)' : 'transparent',
                          borderColor: selected ? '#F97316' : 'rgba(124,58,237,0.3)',
                          color: selected ? '#F97316' : 'text.secondary',
                          fontWeight: selected ? 600 : 400,
                          '&:hover': { bgcolor: selected ? 'rgba(249,115,22,0.25)' : 'rgba(124,58,237,0.08)' },
                        }}
                      />
                    );
                  })}
                </Box>

                <TextField
                  fullWidth
                  label="Suggestions / Preferences"
                  name="suggestion"
                  value={form.suggestion}
                  onChange={handleChange}
                  placeholder="e.g. I hate burpees, focus on upper body, no deadlifts due to back injury"
                  multiline
                  rows={3}
                />

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={handleGenerate}
                  disabled={generating}
                  startIcon={generating ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={{
                    borderColor: 'rgba(249,115,22,0.4)',
                    color: 'warning.main',
                    '&:hover': { borderColor: '#F97316', bgcolor: 'rgba(249,115,22,0.08)' },
                  }}
                >
                  {generating ? 'Generating...' : 'Generate AI Workout'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* ═══ Day Summary Stats ═══ */}
          {currentPlan?.status === 'COMPLETED' && activeDay && (
            <Card sx={{ mt: 3, '&:hover': { transform: 'none' } }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Day Summary</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { label: 'Total Sets', value: activeDay.totalSets || 0, icon: <Repeat fontSize="small" />, color: '#F97316' },
                    { label: 'Duration', value: `${activeDay.totalDurationMinutes || 0} min`, icon: <Timer fontSize="small" />, color: '#3B82F6' },
                    { label: 'Est. Calories', value: activeDay.estimatedCalories || 0, icon: <LocalFireDepartment fontSize="small" />, color: '#EC4899' },
                  ].map((stat) => (
                    <Box key={stat.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                        <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                      </Box>
                      <Typography variant="body1" fontWeight={700} sx={{ color: stat.color }}>
                        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                        {typeof stat.value === 'number' ? ' kcal' : ''}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Divider sx={{ my: 2, borderColor: 'rgba(249,115,22,0.15)' }} />
                <Typography variant="body2" color="text.secondary">
                  {dayExercises.length} exercises across {new Set(dayExercises.map((e) => e.muscleGroup)).size} muscle groups
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* ═══ RIGHT: Workout Plan Display ═══ */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* Generating / Loading state */}
          {generating && (
            <Card sx={{ mb: 3, '&:hover': { transform: 'none' } }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress size={48} sx={{ color: 'warning.main', mb: 2 }} />
                <Typography variant="h6" fontWeight={600}>Generating Your Workout Plan...</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Our AI trainer is crafting a personalized routine for you.
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* No plan yet */}
          {!currentPlan && !generating && (
            <Card sx={{ mb: 3, '&:hover': { transform: 'none' } }}>
              <CardContent sx={{ p: 6, textAlign: 'center' }}>
                <FitnessCenter sx={{ fontSize: 64, color: 'rgba(249,115,22,0.3)', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No Workout Plan Yet</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Fill in your details on the left and click &quot;Generate AI Workout&quot; to get started.
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Failed state */}
          {currentPlan?.status === 'FAILED' && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Workout plan generation failed. Please try again.
            </Alert>
          )}

          {/* Completed plan */}
          {currentPlan?.status === 'COMPLETED' && (
            <>
              {/* Day Navigation */}
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 3 }}>
                {(currentPlan.workoutDays || []).map((day, idx) => (
                  <Button
                    key={idx}
                    variant={selectedDay === idx ? 'contained' : 'outlined'}
                    onClick={() => setSelectedDay(idx)}
                    sx={{
                      minWidth: 100,
                      borderRadius: 3,
                      borderColor: selectedDay === idx ? '#F97316' : 'rgba(249,115,22,0.2)',
                      ...(selectedDay === idx
                        ? { background: 'linear-gradient(135deg, #F97316, #7C3AED)', color: '#fff' }
                        : { color: 'text.secondary' }),
                    }}
                  >
                    {`Day ${day.dayNumber}`}
                  </Button>
                ))}
              </Box>

              {/* Day title */}
              {activeDay && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ color: '#F97316' }}>
                    {activeDay.dayTitle || `Day ${activeDay.dayNumber}`}
                  </Typography>
                </Box>
              )}

              {/* Day summary chips */}
              {activeDay && (
                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  <Chip label={`${activeDay.totalSets || 0} sets`} size="small" sx={{ bgcolor: 'rgba(249,115,22,0.12)', color: '#F97316', fontWeight: 600 }} icon={<Repeat sx={{ fontSize: 16 }} />} />
                  <Chip label={`~${activeDay.totalDurationMinutes || 0} min`} size="small" sx={{ bgcolor: 'rgba(59,130,246,0.12)', color: '#3B82F6', fontWeight: 600 }} icon={<Timer sx={{ fontSize: 16 }} />} />
                  <Chip label={`~${activeDay.estimatedCalories || 0} kcal`} size="small" sx={{ bgcolor: 'rgba(236,72,153,0.12)', color: '#EC4899', fontWeight: 600 }} icon={<LocalFireDepartment sx={{ fontSize: 16 }} />} />
                </Box>
              )}

              {/* Exercise cards */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayExercises.map((exercise, idx) => {
                  const muscleColor = MUSCLE_COLORS[exercise.muscleGroup] || '#A1A1AA';
                  return (
                    <Card key={idx} sx={{ '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(249,115,22,0.2)' } }}>
                      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
                          {/* Left: muscle group badge */}
                          <Box
                            sx={{
                              width: { xs: '100%', md: 64 },
                              minHeight: { xs: 'auto', md: '100%' },
                              bgcolor: `${muscleColor}15`,
                              display: 'flex',
                              flexDirection: { xs: 'row', md: 'column' },
                              alignItems: 'center',
                              justifyContent: { xs: 'flex-start', md: 'center' },
                              px: 2,
                              py: { xs: 1.5, md: 3 },
                              gap: 1,
                              borderLeft: { xs: 'none', md: `4px solid ${muscleColor}` },
                              borderBottom: { xs: `2px solid ${muscleColor}`, md: 'none' },
                            }}
                          >
                            <Typography variant="h6" fontWeight={800} sx={{ color: muscleColor, fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
                              {idx + 1}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: muscleColor,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                fontSize: '0.65rem',
                              }}
                            >
                              {exercise.muscleGroup}
                            </Typography>
                          </Box>

                          {/* Right: exercise details */}
                          <Box sx={{ flex: 1, p: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                              <Box>
                                <Typography variant="subtitle1" fontWeight={700}>{exercise.exerciseName}</Typography>
                                {exercise.notes && (
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                                    💡 {exercise.notes}
                                  </Typography>
                                )}
                              </Box>
                            </Box>

                            {/* Stats row */}
                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                              {[
                                { label: 'Sets', value: exercise.sets, color: '#F97316' },
                                { label: 'Reps', value: exercise.reps, color: '#A78BFA' },
                                { label: 'Rest', value: `${exercise.restSeconds || 60}s`, color: '#3B82F6' },
                                { label: 'RPE', value: exercise.rpe || '-', color: '#EC4899' },
                              ].map((s) => (
                                <Box key={s.label} sx={{ textAlign: 'center', px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: `${s.color}12` }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.6rem' }}>{s.label}</Typography>
                                  <Typography variant="body2" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                                </Box>
                              ))}
                              <Box sx={{ textAlign: 'center', ml: 'auto' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.6rem' }}>Cals</Typography>
                                <Typography variant="body2" fontWeight={700} sx={{ color: '#EC4899' }}>{exercise.estimatedCalories || 0}</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>

              {/* Bottom CTA button */}
              <Box sx={{ mt: 3 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={handleExportPDF}
                  sx={{
                    borderColor: 'rgba(249,115,22,0.3)',
                    color: 'text.primary',
                    '&:hover': { borderColor: '#F97316', bgcolor: 'rgba(249,115,22,0.06)' },
                  }}
                >
                  Export PDF Plan
                </Button>
              </Box>
            </>
          )}
        </Grid>
      </Grid>

      {/* ═══ Toast Snackbar ═══ */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
