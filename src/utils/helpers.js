// Generate a unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Shuffle array using Fisher-Yates algorithm
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get time ago from timestamp
export function getTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMinutes = Math.floor((now - time) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
}

// ELO Rating System
export const ELO_CONFIG = {
  STARTING_ELO: 100,
  WIN_POINTS: 25,
  LOSS_POINTS: 23,
  MIN_ELO: 1
};

// Calculate ELO from existing wins and losses
export function calculateInitialELO(wins = 0, losses = 0) {
  const totalELO = ELO_CONFIG.STARTING_ELO + (wins * ELO_CONFIG.WIN_POINTS) - (losses * ELO_CONFIG.LOSS_POINTS);
  return Math.max(ELO_CONFIG.MIN_ELO, totalELO);
}

// Update ELO after a match result
export function updateELO(currentELO, isWin) {
  const change = isWin ? ELO_CONFIG.WIN_POINTS : -ELO_CONFIG.LOSS_POINTS;
  const newELO = currentELO + change;
  return Math.max(ELO_CONFIG.MIN_ELO, newELO);
}

// Get ELO tier/rank name based on ELO score
export function getELOTier(elo) {
  if (elo >= 300) return { name: 'Legend', color: '#FFD700', icon: '👑' };
  if (elo >= 250) return { name: 'Master', color: '#FF6B6B', icon: '🔥' };
  if (elo >= 200) return { name: 'Expert', color: '#4ECDC4', icon: '⭐' };
  if (elo >= 150) return { name: 'Advanced', color: '#45B7D1', icon: '🎯' };
  if (elo >= 100) return { name: 'Intermediate', color: '#96CEB4', icon: '🌟' };
  if (elo >= 50) return { name: 'Beginner', color: '#FFEAA7', icon: '🌱' };
  return { name: 'Novice', color: '#DDA0DD', icon: '🥚' };
}

// Sort players by ELO (highest first)
export function sortPlayersByELO(players) {
  return [...players].sort((a, b) => {
    const eloA = a.elo || calculateInitialELO(a.wins, a.losses);
    const eloB = b.elo || calculateInitialELO(b.wins, b.losses);
    return eloB - eloA;
  });
} 