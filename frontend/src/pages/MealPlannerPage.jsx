import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  MenuItem, CircularProgress, Alert, LinearProgress, Chip,
  IconButton, Paper, Divider, Dialog, DialogTitle, DialogContent,
  DialogActions, InputAdornment, Snackbar, Collapse, List, ListItem,
  ListItemText, ListItemIcon,
} from '@mui/material';
import {
  Psychology, ShoppingCart, Refresh, Edit,
  RestaurantMenu, AddCircle, Print, AccessTime,
  Close, CheckCircle, ExpandMore, ExpandLess,
  Delete,
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
];

const DIET_TYPES = [
  { value: 'HIGH_PROTEIN', label: 'High Protein' },
  { value: 'KETO', label: 'Keto' },
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'PALEO', label: 'Paleo' },
  { value: 'BALANCED', label: 'Balanced' },
];

const FOOD_VARIETIES = [
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'NON_VEGETARIAN', label: 'Non-Vegetarian' },
  { value: 'EGGETARIAN', label: 'Eggetarian' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MEAL_ICONS = {
  BREAKFAST: '🌅',
  LUNCH: '☀️',
  DINNER: '🌙',
  SNACK: '🥤',
};

const MEAL_COLORS = {
  BREAKFAST: '#F97316',
  LUNCH: '#10B981',
  DINNER: '#7C3AED',
  SNACK: '#EC4899',
};

const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'SNACK', label: 'Snack' },
];

// ─── Component ──────────────────────────────────────────────────

export default function MealPlannerPage() {
  const { user } = useAuth();
  const pollRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    age: '',
    weight: '',
    height: '',
    goal: 'MUSCLE_GAIN',
    dietType: 'HIGH_PROTEIN',
    foodVariety: 'NON_VEGETARIAN',
    days: 1,
    suggestion: '',
    targetProtein: '',
    targetCarbs: '',
    targetFat: '',
    targetCalories: '',
  });

  // Plan state
  const [currentPlan, setCurrentPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Custom entry dialog state
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customMeal, setCustomMeal] = useState({
    mealType: 'SNACK',
    time: '',
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    ingredients: '',
  });
  const [saving, setSaving] = useState(false);

  // Shopping list state
  const [shoppingListOpen, setShoppingListOpen] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ['age', 'weight', 'height', 'days', 'targetProtein', 'targetCarbs', 'targetFat', 'targetCalories'].includes(name)
        ? (value === '' ? '' : Number(value))
        : value,
    }));
  };

  // Polling logic — polls the plan until it's COMPLETED or FAILED
  // Also stops after MAX_POLL_TIME (60s) to avoid infinite spinning on stale plans.
  const MAX_POLL_MS = 60_000;
  const POLL_INTERVAL = 2000;

  const startPolling = useCallback((planId) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const startTime = Date.now();

    pollRef.current = setInterval(async () => {
      // Safety timeout: stop polling if it's been too long
      if (Date.now() - startTime > MAX_POLL_MS) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setGenerating(false);
        setError('Generation timed out. The AI may be slow — please try again.');
        return;
      }

      try {
        const res = await api.get(`/mealplan/${planId}`);
        const plan = res.data;
        setCurrentPlan(plan);

        if (plan.status === 'COMPLETED' || plan.status === 'FAILED') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setGenerating(false);
          if (plan.status === 'COMPLETED' && plan.dayPlans?.length > 0) {
            setSelectedDay(0);
          }
          if (plan.status === 'FAILED') {
            setError('Meal plan generation failed. Please try again.');
          }
        }
      } catch {
        // ignore poll errors
      }
    }, POLL_INTERVAL);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Load user's latest plan on mount
  // Skip PENDING plans older than 5 minutes — they're from crashed sessions
  // where the RabbitMQ message was already consumed but never updated.
  const STALE_THRESHOLD_MS = 5 * 60 * 1000;

  useEffect(() => {
    async function loadLatest() {
      try {
        const res = await api.get(`/mealplan/user/${user.userId}`);
        const plans = res.data || [];
        const latest = plans.length > 0 ? plans[0] : null;
        if (!latest) return;

        if (latest.status === 'COMPLETED') {
          setCurrentPlan(latest);
          if (latest.dayPlans?.length > 0) setSelectedDay(0);
        } else if (latest.status === 'PENDING') {
          const age = Date.now() - new Date(latest.createdAt).getTime();
          if (age < STALE_THRESHOLD_MS) {
            // Fresh PENDING — might still be generating
            setCurrentPlan(latest);
            setGenerating(true);
            startPolling(latest.id);
          }
          // Old PENDING — silently skip, treat as if no plan
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
        ...form,
        age: form.age || null,
        weight: form.weight || null,
        height: form.height || null,
        targetProtein: form.targetProtein || null,
        targetCarbs: form.targetCarbs || null,
        targetFat: form.targetFat || null,
        targetCalories: form.targetCalories || null,
      };
      const res = await api.post('/mealplan', body);
      const plan = res.data;
      setCurrentPlan(plan);
      startPolling(plan.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate meal plan');
      setGenerating(false);
    }
  };

  // ─── Add Custom Entry ─────────────────────────────────────────
  const openCustomDialog = () => {
    setCustomMeal({
      mealType: 'SNACK',
      time: '',
      name: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      ingredients: '',
    });
    setCustomDialogOpen(true);
  };

  const handleCustomMealChange = (e) => {
    const { name, value } = e.target;
    setCustomMeal((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCustomMeal = async () => {
    if (!customMeal.name.trim()) {
      showToast('Meal name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const ingredientsList = customMeal.ingredients
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const mealPayload = {
        mealType: customMeal.mealType,
        time: customMeal.time || 'Custom',
        name: customMeal.name.trim(),
        calories: parseInt(customMeal.calories) || 0,
        protein: parseFloat(customMeal.protein) || 0,
        carbs: parseFloat(customMeal.carbs) || 0,
        fat: parseFloat(customMeal.fat) || 0,
        ingredients: ingredientsList,
      };

      const res = await api.post(
        `/mealplan/${currentPlan.id}/day/${selectedDay}/meal`,
        mealPayload,
      );

      setCurrentPlan(res.data);
      setCustomDialogOpen(false);
      showToast(`Added "${mealPayload.name}" to ${DAY_LABELS[selectedDay % 7]}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add custom entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Shopping List ────────────────────────────────────────────
  const getShoppingList = () => {
    if (!currentPlan?.dayPlans) return [];
    const ingredientMap = {};
    currentPlan.dayPlans.forEach((day) => {
      day.meals?.forEach((meal) => {
        meal.ingredients?.forEach((ing) => {
          const key = ing.toLowerCase().trim();
          if (!ingredientMap[key]) {
            ingredientMap[key] = { name: ing, count: 0 };
          }
          ingredientMap[key].count += 1;
        });
      });
    });
    return Object.values(ingredientMap).sort((a, b) => a.name.localeCompare(b.name));
  };

  // ─── Export PDF ────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!currentPlan?.dayPlans) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Meal Plan', 105, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(
      `Goal: ${currentPlan.goal}  |  Diet: ${currentPlan.dietType}  |  Food Variety: ${currentPlan.foodVariety}`,
      105, 26, { align: 'center' },
    );
    if (currentPlan.targetCalories) {
      doc.text(
        `Target: ${currentPlan.targetCalories} kcal  |  P: ${currentPlan.targetProtein || 'auto'}g  C: ${currentPlan.targetCarbs || 'auto'}g  F: ${currentPlan.targetFat || 'auto'}g`,
        105, 32, { align: 'center' },
      );
    }
    doc.setTextColor(0);

    // Loop through each day
    currentPlan.dayPlans.forEach((day, dayIdx) => {
      if (dayIdx > 0) doc.addPage();

      const dayLabel = DAY_LABELS[dayIdx % 7];
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(124, 58, 237); // purple accent
      doc.text(`Day ${day.dayNumber} — ${dayLabel}`, 14, dayIdx > 0 ? 20 : 40);
      doc.setTextColor(0);

      // Day totals chip
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(
        `${Math.round(day.totalCalories)} kcal  |  P: ${Math.round(day.totalProtein)}g  C: ${Math.round(day.totalCarbs)}g  F: ${Math.round(day.totalFat)}g`,
        14, dayIdx > 0 ? 26 : 46,
      );
      doc.setTextColor(0);

      const tableBody = day.meals.map((meal) => [
        MEAL_ICONS[meal.mealType] || '🍽️',
        meal.mealType,
        meal.time || '—',
        meal.name,
        `${meal.calories || 0}`,
        `${Math.round(meal.protein || 0)}g`,
        `${Math.round(meal.carbs || 0)}g`,
        `${Math.round(meal.fat || 0)}g`,
        meal.ingredients?.join(', ') || '',
      ]);

      autoTable(doc, {
        startY: dayIdx > 0 ? 30 : 50,
        head: [['', 'Type', 'Time', 'Meal', 'Cal', 'Protein', 'Carbs', 'Fat', 'Ingredients']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [124, 58, 237],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 22 },
          2: { cellWidth: 20 },
          4: { halign: 'right', cellWidth: 14 },
          5: { halign: 'right', cellWidth: 16 },
          6: { halign: 'right', cellWidth: 14 },
          7: { halign: 'right', cellWidth: 14 },
        },
        alternateRowStyles: { fillColor: [248, 245, 252] },
        margin: { left: 14, right: 14 },
      });
    });

    // Shopping list page at the end
    const shoppingList = getShoppingList();
    if (shoppingList.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(236, 72, 153);
      doc.text('Shopping List', 14, 20);
      doc.setTextColor(0);

      autoTable(doc, {
        startY: 28,
        head: [['#', 'Ingredient', 'Used In Meals']],
        body: shoppingList.map((item, idx) => [
          idx + 1,
          item.name,
          `${item.count} meal${item.count > 1 ? 's' : ''}`,
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: [236, 72, 153],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          2: { halign: 'center', cellWidth: 30 },
        },
        alternateRowStyles: { fillColor: [254, 242, 248] },
        margin: { left: 14, right: 14 },
      });
    }

    doc.save(`meal-plan-${currentPlan.goal?.toLowerCase() || 'plan'}-${Date.now()}.pdf`);
    showToast('PDF exported successfully!');
  };

  // ─── Derived data for the selected day ───
  const activeDay = currentPlan?.dayPlans?.[selectedDay] || null;
  const dayMeals = activeDay?.meals || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* ═══ Page Header ═══ */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Meal Planner</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: 600 }}>
            Fuel your performance with AI-driven nutrition tailored to your goals and dietary preferences.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<ShoppingCart />}
          disabled={!currentPlan || currentPlan.status !== 'COMPLETED'}
          onClick={() => setShoppingListOpen((prev) => !prev)}
          sx={{
            background: 'linear-gradient(135deg, #EC4899, #7C3AED)',
            '&:hover': { background: 'linear-gradient(135deg, #DB2777, #5B21B6)' },
          }}
        >
          {shoppingListOpen ? 'Hide Shopping List' : 'Generate Shopping List'}
        </Button>
      </Box>

      {/* ═══ Shopping List Panel ═══ */}
      <Collapse in={shoppingListOpen}>
        <Card sx={{ mb: 1, '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              🛒 Shopping List — {getShoppingList().length} unique ingredients
            </Typography>
            <Grid container spacing={1}>
              {getShoppingList().map((item, idx) => (
                <Grid key={idx} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Chip
                    label={`${item.name} (${item.count})`}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: 'rgba(236,72,153,0.3)', color: 'text.primary', fontSize: '0.8rem' }}
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Collapse>

      <Grid container spacing={3}>
        {/* ═══ LEFT: AI Configuration Form ═══ */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Psychology sx={{ color: 'secondary.main' }} />
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

                <TextField fullWidth label="Height (cm)" name="height" type="number" value={form.height} onChange={handleChange} inputProps={{ min: 100, max: 250 }} />

                <TextField select fullWidth label="Primary Goal" name="goal" value={form.goal} onChange={handleChange}>
                  {GOALS.map((g) => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
                </TextField>

                <TextField select fullWidth label="Diet Type" name="dietType" value={form.dietType} onChange={handleChange}>
                  {DIET_TYPES.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
                </TextField>

                <TextField select fullWidth label="Food Variety" name="foodVariety" value={form.foodVariety} onChange={handleChange}>
                  {FOOD_VARIETIES.map((f) => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
                </TextField>

                <TextField select fullWidth label="Plan Duration" name="days" value={form.days} onChange={handleChange}>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => <MenuItem key={d} value={d}>{d} Day{d > 1 ? 's' : ''}</MenuItem>)}
                </TextField>

                <TextField
                  fullWidth
                  label="Suggestion / Preferences"
                  name="suggestion"
                  value={form.suggestion}
                  onChange={handleChange}
                  placeholder="e.g. I love paneer, avoid deep-fried food, prefer Indian spices"
                  multiline
                  rows={3}
                />

                <Divider sx={{ borderColor: 'rgba(124,58,237,0.15)' }} />
                <Typography variant="subtitle2" color="text.secondary">Target Macros (optional — AI computes if blank)</Typography>

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField fullWidth label="Protein (g/day)" name="targetProtein" type="number" value={form.targetProtein} onChange={handleChange} />
                  </Grid>
                  <Grid size={6}>
                    <TextField fullWidth label="Carbs (g/day)" name="targetCarbs" type="number" value={form.targetCarbs} onChange={handleChange} />
                  </Grid>
                </Grid>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField fullWidth label="Fats (g/day)" name="targetFat" type="number" value={form.targetFat} onChange={handleChange} />
                  </Grid>
                  <Grid size={6}>
                    <TextField fullWidth label="Calories (kcal/day)" name="targetCalories" type="number" value={form.targetCalories} onChange={handleChange} />
                  </Grid>
                </Grid>

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={handleGenerate}
                  disabled={generating}
                  startIcon={generating ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={{
                    borderColor: 'rgba(236,72,153,0.4)',
                    color: 'secondary.main',
                    '&:hover': { borderColor: 'secondary.main', bgcolor: 'rgba(236,72,153,0.08)' },
                  }}
                >
                  {generating ? 'Generating...' : 'Generate AI Plan'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* ═══ Target Macros Summary ═══ */}
          {currentPlan?.status === 'COMPLETED' && (
            <Card sx={{ mt: 3, '&:hover': { transform: 'none' } }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Daily Macro Targets</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {[
                    { label: 'Protein', target: currentPlan.targetProtein, actual: activeDay?.totalProtein, color: '#EC4899' },
                    { label: 'Carbs', target: currentPlan.targetCarbs, actual: activeDay?.totalCarbs, color: '#A78BFA' },
                    { label: 'Fats', target: currentPlan.targetFat, actual: activeDay?.totalFat, color: '#F472B6' },
                  ].map((macro) => {
                    const pct = macro.target && macro.target > 0
                      ? Math.min(100, Math.round(((macro.actual || 0) / macro.target) * 100))
                      : 0;
                    return (
                      <Box key={macro.label}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">{macro.label}</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: macro.color }}>
                            {Math.round(macro.actual || 0)}g / {macro.target ? `${Math.round(macro.target)}g` : 'auto'}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            '& .MuiLinearProgress-bar': { background: macro.color },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
                <Divider sx={{ my: 2, borderColor: 'rgba(124,58,237,0.15)' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Total Calories</Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {Math.round(activeDay?.totalCalories || 0).toLocaleString()}
                    <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 0.5 }}>kcal</Typography>
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* ═══ RIGHT: Meal Plan Display ═══ */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* Generating / Loading state */}
          {generating && (
            <Card sx={{ mb: 3, '&:hover': { transform: 'none' } }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress size={48} sx={{ color: 'secondary.main', mb: 2 }} />
                <Typography variant="h6" fontWeight={600}>Generating Your Meal Plan...</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Our AI nutritionist is crafting a personalized plan for you.
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* No plan yet */}
          {!currentPlan && !generating && (
            <Card sx={{ mb: 3, '&:hover': { transform: 'none' } }}>
              <CardContent sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">No Meal Plan Yet</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Fill in your details on the left and click &quot;Generate AI Plan&quot; to get started.
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Failed state */}
          {currentPlan?.status === 'FAILED' && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Meal plan generation failed. Please try again.
            </Alert>
          )}

          {/* Completed plan */}
          {currentPlan?.status === 'COMPLETED' && (
            <>
              {/* Day Navigation */}
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 3 }}>
                {(currentPlan.dayPlans || []).map((day, idx) => (
                  <Button
                    key={idx}
                    variant={selectedDay === idx ? 'contained' : 'outlined'}
                    onClick={() => setSelectedDay(idx)}
                    sx={{
                      minWidth: 70,
                      borderRadius: 3,
                      borderColor: selectedDay === idx ? 'secondary.main' : 'rgba(124,58,237,0.2)',
                      ...(selectedDay === idx
                        ? { background: 'linear-gradient(135deg, #EC4899, #7C3AED)', color: '#fff' }
                        : { color: 'text.secondary' }),
                    }}
                  >
                    {DAY_LABELS[idx % 7]}
                  </Button>
                ))}
              </Box>

              {/* Day summary chips */}
              {activeDay && (
                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  <Chip label={`${Math.round(activeDay.totalCalories)} kcal`} size="small" sx={{ bgcolor: 'rgba(236,72,153,0.12)', color: '#EC4899', fontWeight: 600 }} />
                  <Chip label={`P: ${Math.round(activeDay.totalProtein)}g`} size="small" sx={{ bgcolor: 'rgba(124,58,237,0.12)', color: '#A78BFA', fontWeight: 600 }} />
                  <Chip label={`C: ${Math.round(activeDay.totalCarbs)}g`} size="small" sx={{ bgcolor: 'rgba(167,139,250,0.12)', color: '#d2bbff', fontWeight: 600 }} />
                  <Chip label={`F: ${Math.round(activeDay.totalFat)}g`} size="small" sx={{ bgcolor: 'rgba(244,114,182,0.12)', color: '#F472B6', fontWeight: 600 }} />
                  <Chip label={`${dayMeals.length} meals`} size="small" sx={{ bgcolor: 'rgba(16,185,129,0.12)', color: '#10B981', fontWeight: 600 }} />
                </Box>
              )}

              {/* Meals feed */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {dayMeals.map((meal, idx) => (
                  <Card key={idx} sx={{ '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(124,58,237,0.2)' } }}>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
                        {/* Left: meal type badge area */}
                        <Box
                          sx={{
                            width: { xs: '100%', md: 56 },
                            minHeight: { xs: 'auto', md: '100%' },
                            bgcolor: `${MEAL_COLORS[meal.mealType] || '#7C3AED'}15`,
                            display: 'flex',
                            flexDirection: { xs: 'row', md: 'column' },
                            alignItems: 'center',
                            justifyContent: { xs: 'flex-start', md: 'center' },
                            px: 2,
                            py: { xs: 1.5, md: 3 },
                            gap: 1,
                            borderLeft: { xs: 'none', md: `4px solid ${MEAL_COLORS[meal.mealType] || '#7C3AED'}` },
                            borderBottom: { xs: `2px solid ${MEAL_COLORS[meal.mealType] || '#7C3AED'}`, md: 'none' },
                          }}
                        >
                          <Typography sx={{ fontSize: 28 }}>{MEAL_ICONS[meal.mealType] || '🍽️'}</Typography>
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: MEAL_COLORS[meal.mealType], textTransform: 'uppercase', letterSpacing: 1 }}>
                              {meal.mealType}
                            </Typography>
                            {meal.time && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                <AccessTime sx={{ fontSize: 10, mr: 0.3, verticalAlign: 'middle' }} />
                                {meal.time}
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        {/* Right: meal details */}
                        <Box sx={{ flex: 1, p: 2.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={700}>{meal.name}</Typography>
                              {meal.ingredients?.length > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                  {meal.ingredients.join(' • ')}
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                                <Refresh fontSize="small" />
                              </IconButton>
                              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>

                          {/* Macro row */}
                          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {[
                              { label: 'Protein', value: meal.protein, unit: 'g' },
                              { label: 'Carbs', value: meal.carbs, unit: 'g' },
                              { label: 'Fat', value: meal.fat, unit: 'g' },
                            ].map((m) => (
                              <Box key={m.label} sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.6rem' }}>{m.label}</Typography>
                                <Typography variant="body2" fontWeight={700}>{Math.round(m.value || 0)}{m.unit}</Typography>
                              </Box>
                            ))}
                            <Box sx={{ textAlign: 'center', ml: 'auto' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.6rem' }}>Cals</Typography>
                              <Typography variant="body2" fontWeight={700} color="secondary.main">{meal.calories || 0}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              {/* Bottom CTA buttons */}
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AddCircle />}
                  onClick={openCustomDialog}
                  sx={{
                    borderColor: 'rgba(124,58,237,0.3)',
                    color: 'text.primary',
                    '&:hover': { borderColor: '#7C3AED', bgcolor: 'rgba(124,58,237,0.06)' },
                  }}
                >
                  Add Custom Entry
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={handleExportPDF}
                  sx={{
                    borderColor: 'rgba(236,72,153,0.3)',
                    color: 'text.primary',
                    '&:hover': { borderColor: '#EC4899', bgcolor: 'rgba(236,72,153,0.06)' },
                  }}
                >
                  Export PDF Plan
                </Button>
              </Box>
            </>
          )}
        </Grid>
      </Grid>

      {/* ═══ Add Custom Entry Dialog ═══ */}
      <Dialog open={customDialogOpen} onClose={() => setCustomDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Add Custom Meal — {DAY_LABELS[selectedDay % 7]}
          </Typography>
          <IconButton size="small" onClick={() => setCustomDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              select fullWidth label="Meal Type" name="mealType"
              value={customMeal.mealType} onChange={handleCustomMealChange}
            >
              {MEAL_TYPES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>

            <TextField
              fullWidth label="Meal Name *" name="name"
              value={customMeal.name} onChange={handleCustomMealChange}
              placeholder="e.g. Protein Smoothie Bowl"
            />

            <TextField
              fullWidth label="Time" name="time"
              value={customMeal.time} onChange={handleCustomMealChange}
              placeholder="e.g. 10:00 AM"
            />

            <Divider sx={{ borderColor: 'rgba(124,58,237,0.15)' }} />
            <Typography variant="subtitle2" color="text.secondary">Nutrition (leave blank for 0)</Typography>

            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField fullWidth label="Calories" name="calories" type="number" value={customMeal.calories} onChange={handleCustomMealChange} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="Protein (g)" name="protein" type="number" value={customMeal.protein} onChange={handleCustomMealChange} />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField fullWidth label="Carbs (g)" name="carbs" type="number" value={customMeal.carbs} onChange={handleCustomMealChange} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="Fat (g)" name="fat" type="number" value={customMeal.fat} onChange={handleCustomMealChange} />
              </Grid>
            </Grid>

            <TextField
              fullWidth label="Ingredients" name="ingredients"
              value={customMeal.ingredients} onChange={handleCustomMealChange}
              placeholder="Comma-separated, e.g. Banana, Whey protein, Almond milk, Honey"
              multiline rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCustomDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCustomMeal}
            disabled={saving || !customMeal.name.trim()}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <AddCircle />}
            sx={{
              background: 'linear-gradient(135deg, #EC4899, #7C3AED)',
              '&:hover': { background: 'linear-gradient(135deg, #DB2777, #5B21B6)' },
            }}
          >
            {saving ? 'Adding...' : 'Add Meal'}
          </Button>
        </DialogActions>
      </Dialog>

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
