import { 
  generateId, 
  shuffleArray, 
  getTimeAgo, 
  calculateInitialELO, 
  updateELO, 
  getELOTier,
  sortPlayersByELO,
  sortPlayersByWins,
  ELO_CONFIG
} from './helpers';

describe('Helper Functions', () => {
  describe('generateId', () => {
    test('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    test('should generate IDs with expected format', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('shuffleArray', () => {
    test('should return a new array with same elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);
      
      expect(shuffled).not.toBe(original); // Different reference
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    test('should handle empty array', () => {
      const original = [];
      const shuffled = shuffleArray(original);
      
      expect(shuffled).toEqual([]);
      expect(shuffled).not.toBe(original);
    });

    test('should handle single element array', () => {
      const original = [42];
      const shuffled = shuffleArray(original);
      
      expect(shuffled).toEqual([42]);
      expect(shuffled).not.toBe(original);
    });

    test('should not modify original array', () => {
      const original = [1, 2, 3, 4, 5];
      const originalCopy = [...original];
      shuffleArray(original);
      
      expect(original).toEqual(originalCopy);
    });
  });

  describe('getTimeAgo', () => {
    beforeEach(() => {
      // Mock Date.now() to return a fixed timestamp
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should return "Just now" for very recent times', () => {
      const timestamp = new Date('2024-01-01T11:59:30Z').toISOString();
      expect(getTimeAgo(timestamp)).toBe('Just now');
    });

    test('should return minutes for recent times', () => {
      const timestamp = new Date('2024-01-01T11:30:00Z').toISOString();
      expect(getTimeAgo(timestamp)).toBe('30 minutes ago');
    });

    test('should return singular minute for 1 minute', () => {
      const timestamp = new Date('2024-01-01T11:59:00Z').toISOString();
      expect(getTimeAgo(timestamp)).toBe('1 minute ago');
    });

    test('should return hours for older times', () => {
      const timestamp = new Date('2024-01-01T10:00:00Z').toISOString();
      expect(getTimeAgo(timestamp)).toBe('2 hours ago');
    });

    test('should return singular hour for 1 hour', () => {
      const timestamp = new Date('2024-01-01T11:00:00Z').toISOString();
      expect(getTimeAgo(timestamp)).toBe('1 hour ago');
    });

    test('should return days for very old times', () => {
      const timestamp = new Date('2023-12-30T12:00:00Z').toISOString();
      expect(getTimeAgo(timestamp)).toBe('2 days ago');
    });

    test('should return singular day for 1 day', () => {
      const timestamp = new Date('2023-12-31T12:00:00Z').toISOString();
      expect(getTimeAgo(timestamp)).toBe('1 day ago');
    });
  });

  describe('ELO System', () => {
    describe('calculateInitialELO', () => {
      test('should calculate ELO from wins and losses', () => {
        expect(calculateInitialELO(0, 0)).toBe(100); // Starting ELO
        expect(calculateInitialELO(5, 3)).toBe(100 + (5 * 25) - (3 * 22)); // 100 + 125 - 66 = 159
        expect(calculateInitialELO(10, 0)).toBe(100 + (10 * 25)); // 350
      });

      test('should not go below minimum ELO', () => {
        expect(calculateInitialELO(0, 10)).toBe(1); // Should be capped at minimum
        expect(calculateInitialELO(1, 20)).toBe(1); // Large losses still capped
      });
    });

    describe('updateELO', () => {
      test('should add points for wins', () => {
        expect(updateELO(100, true)).toBe(125); // +25 for win
        expect(updateELO(200, true)).toBe(225);
      });

      test('should subtract points for losses', () => {
        expect(updateELO(100, false)).toBe(78); // -22 for loss
        expect(updateELO(200, false)).toBe(178);
      });

      test('should not go below minimum ELO', () => {
        expect(updateELO(20, false)).toBe(1); // Should be capped at 1
        expect(updateELO(1, false)).toBe(1); // Already at minimum
      });
    });

    describe('getELOTier', () => {
      test('should return correct tiers for different ELO ranges', () => {
        expect(getELOTier(50).name).toBe('Novice'); // Below 100
        expect(getELOTier(150).name).toBe('Beginner'); // 100-200
        expect(getELOTier(250).name).toBe('Intermediate'); // 200-300
        expect(getELOTier(350).name).toBe('Advanced'); // 300-500
        expect(getELOTier(550).name).toBe('Expert'); // 500-750
        expect(getELOTier(800).name).toBe('Master'); // 750-1000
        expect(getELOTier(1100).name).toBe('Legend'); // 1000+
      });

      test('should return tier with color and icon', () => {
        const tier = getELOTier(200);
        expect(tier).toHaveProperty('name');
        expect(tier).toHaveProperty('color');
        expect(tier).toHaveProperty('icon');
        expect(typeof tier.color).toBe('string');
        expect(typeof tier.icon).toBe('string');
      });
    });

    describe('sortPlayersByELO', () => {
      test('should sort players by ELO descending', () => {
        const players = [
          { id: '1', name: 'Alice', elo: 150 },
          { id: '2', name: 'Bob', elo: 200 },
          { id: '3', name: 'Charlie', elo: 100 }
        ];

        const sorted = sortPlayersByELO(players);
        expect(sorted[0].name).toBe('Bob'); // Highest ELO
        expect(sorted[1].name).toBe('Alice');
        expect(sorted[2].name).toBe('Charlie'); // Lowest ELO
      });

      test('should handle missing ELO values', () => {
        const players = [
          { id: '1', name: 'Alice', wins: 5, losses: 2 },
          { id: '2', name: 'Bob', elo: 200 }
        ];

        const sorted = sortPlayersByELO(players);
        expect(sorted[0].name).toBe('Bob'); // Has explicit ELO
        expect(sorted[1].name).toBe('Alice'); // Calculated ELO
      });
    });

    describe('sortPlayersByWins', () => {
      test('should sort players by session wins descending', () => {
        const players = [
          { id: '1', name: 'Alice', sessionWins: 3, sessionLosses: 1 },
          { id: '2', name: 'Bob', sessionWins: 5, sessionLosses: 2 },
          { id: '3', name: 'Charlie', sessionWins: 2, sessionLosses: 0 }
        ];

        const sorted = sortPlayersByWins(players);
        expect(sorted[0].name).toBe('Bob'); // Most wins
        expect(sorted[1].name).toBe('Alice');
        expect(sorted[2].name).toBe('Charlie'); // Fewest wins
      });

      test('should use losses as tiebreaker', () => {
        const players = [
          { id: '1', name: 'Alice', sessionWins: 3, sessionLosses: 2 },
          { id: '2', name: 'Bob', sessionWins: 3, sessionLosses: 1 }
        ];

        const sorted = sortPlayersByWins(players);
        expect(sorted[0].name).toBe('Bob'); // Same wins, fewer losses
        expect(sorted[1].name).toBe('Alice');
      });
    });
  });
}); 