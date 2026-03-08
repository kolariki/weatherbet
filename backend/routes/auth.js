import { Router } from 'express';
import { supabase, verifyToken, getProfile } from '../services/supabaseClient.js';

const router = Router();

// Middleware to extract user (optional — doesn't block if no token)
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = await verifyToken(token);
    if (user) {
      req.user = user;
      req.profile = await getProfile(user.id);
    }
  }
  next();
}

// Middleware to require auth
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  const token = authHeader.slice(7);
  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  req.user = user;
  req.profile = await getProfile(user.id);
  if (!req.profile) {
    return res.status(404).json({ error: 'Perfil no encontrado' });
  }

  next();
}

// Middleware to require admin
export async function requireAdmin(req, res, next) {
  if (!req.profile?.is_admin) {
    return res.status(403).json({ error: 'Se requieren permisos de administrador' });
  }
  next();
}

// GET /api/profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = req.profile;

    const { data: positions } = await supabase
      .from('positions')
      .select('*, markets(question, status, result)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    const totalBets = positions?.length || 0;
    const resolvedPositions = positions?.filter((p) => p.won !== null) || [];
    const wins = resolvedPositions.filter((p) => p.won).length;
    const losses = resolvedPositions.filter((p) => !p.won).length;
    const winRate = resolvedPositions.length > 0 ? ((wins / resolvedPositions.length) * 100).toFixed(1) : 0;

    res.json({
      ...profile,
      email: req.user.email,
      total_bets: totalBets,
      total_wins: wins,
      total_losses: losses,
      win_rate: parseFloat(winRate),
      recent_bets: (positions || []).slice(0, 10),
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// GET /api/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, total_bets, total_wins, total_profit, balance_credits')
      .order('total_profit', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Error al obtener leaderboard' });
  }
});

export default router;
