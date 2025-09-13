import { 
  generateId, 
  shuffleArray, 
  getTimeAgo, 
  calculateInitialELO, 
  updateELO, 
  calculateELOChange,
  calculateTeamELO,
  calculateExpectedScore,
  calculateKFactor,
  updateConfidence,
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

  describe('Advanced ELO System', () => {
    describe('calculateInitialELO', () => {
      test('should return starting ELO for new players', () => {
        expect(calculateInitialELO(0, 0)).toBe(1200); // New starting ELO
      });

      test('should estimate ELO based on win rate', () => {
        expect(calculateInitialELO(5, 5)).toBe(1200); // 50% win rate = starting ELO
        expect(calculateInitialELO(6, 4)).toBe(1300); // 60% win rate = +100 ELO
        expect(calculateInitialELO(4, 6)).toBe(1100); // 40% win rate = -100 ELO
      });

      test('should not go below minimum ELO', () => {
        expect(calculateInitialELO(0, 20)).toBe(700); // Very low win rate
      });

      test('should not go above maximum ELO', () => {
        expect(calculateInitialELO(20, 0)).toBe(1700); // Very high win rate
      });
    });

    describe('calculateExpectedScore', () => {
      test('should return 0.5 for equal ELO players', () => {
        expect(calculateExpectedScore(1200, 1200)).toBeCloseTo(0.5, 2);
      });

      test('should favor higher ELO player', () => {
        expect(calculateExpectedScore(1300, 1200)).toBeGreaterThan(0.5);
        expect(calculateExpectedScore(1200, 1300)).toBeLessThan(0.5);
      });

      test('should handle large ELO differences', () => {
        expect(calculateExpectedScore(2000, 1000)).toBeCloseTo(1, 1);
        expect(calculateExpectedScore(1000, 2000)).toBeCloseTo(0, 1);
      });
    });

    describe('calculateTeamELO', () => {
      test('should calculate average team ELO', () => {
        expect(calculateTeamELO(1200, 1200)).toBe(1200);
        expect(calculateTeamELO(1000, 1400)).toBe(1200);
        expect(calculateTeamELO(1300, 1500)).toBe(1400);
      });
    });

    describe('calculateKFactor', () => {
      test('should use high K-factor for new players', () => {
        expect(calculateKFactor(5)).toBe(40); // New player
        expect(calculateKFactor(15)).toBe(40); // Still in calibration
      });

      test('should use base K-factor for regular players', () => {
        expect(calculateKFactor(50)).toBe(32); // Regular player
      });

      test('should use low K-factor for experienced players', () => {
        expect(calculateKFactor(150)).toBe(16); // Experienced player
      });

      test('should adjust for confidence', () => {
        expect(calculateKFactor(50, 0.8)).toBeGreaterThan(32); // Lower confidence = higher K
        expect(calculateKFactor(50, 1.0)).toBe(32); // Full confidence = base K
      });
    });

    describe('calculateELOChange', () => {
      test('should calculate proper ELO changes', () => {
        const result = calculateELOChange({
          playerELO: 1200,
          opponentELO: 1200,
          isWin: true,
          matchCount: 50
        });

        expect(result.newELO).toBeGreaterThan(1200);
        expect(result.eloChange).toBeGreaterThan(0);
        expect(result.expectedScore).toBeCloseTo(0.5, 2);
        expect(result.kFactor).toBe(32);
      });

      test('should give more points for upsets', () => {
        const upset = calculateELOChange({
          playerELO: 1200,
          opponentELO: 1400,
          isWin: true,
          matchCount: 50
        });

        const expected = calculateELOChange({
          playerELO: 1200,
          opponentELO: 1200,
          isWin: true,
          matchCount: 50
        });

        expect(upset.eloChange).toBeGreaterThan(expected.eloChange);
      });

      test('should lose fewer points for expected losses', () => {
        const expectedLoss = calculateELOChange({
          playerELO: 1200,
          opponentELO: 1400,
          isWin: false,
          matchCount: 50
        });

        const unexpectedLoss = calculateELOChange({
          playerELO: 1400,
          opponentELO: 1200,
          isWin: false,
          matchCount: 50
        });

        expect(Math.abs(expectedLoss.eloChange)).toBeLessThan(Math.abs(unexpectedLoss.eloChange));
      });
    });

    describe('updateConfidence', () => {
      test('should use calibration confidence for new players', () => {
        // During calibration (first 10 matches), confidence should be lower but constrained by DB
        expect(updateConfidence(1.0, 0)).toBeCloseTo(0.5, 1); // First match
        expect(updateConfidence(1.0, 5)).toBeCloseTo(0.6, 1); // Mid calibration
        expect(updateConfidence(1.0, 9)).toBeCloseTo(0.68, 1); // Late calibration
      });

      test('should maintain higher confidence for experienced players', () => {
        // Post-calibration players should maintain higher confidence
        expect(updateConfidence(0.8, 15)).toBeCloseTo(0.8, 1);
        expect(updateConfidence(0.9, 50)).toBeCloseTo(0.9, 1);
      });

      test('should enforce minimum confidence bounds', () => {
        // Both calibration and post-calibration minimum is 0.5 (DB constraint)
        expect(updateConfidence(0.1, 5)).toBeGreaterThanOrEqual(0.5);
        expect(updateConfidence(0.3, 15)).toBeGreaterThanOrEqual(0.5);
      });

      test('should enforce maximum confidence', () => {
        expect(updateConfidence(1.2, 5)).toBeLessThanOrEqual(1.0);
        expect(updateConfidence(1.5, 15)).toBeLessThanOrEqual(1.0);
      });

      test('should adjust confidence based on match results', () => {
        // Wins should increase confidence, losses should decrease it
        const baseConfidence = updateConfidence(0.5, 5);
        const winConfidence = updateConfidence(0.5, 5, 'win');
        const lossConfidence = updateConfidence(0.5, 5, 'loss');
        
        expect(winConfidence).toBeGreaterThan(baseConfidence);
        expect(lossConfidence).toBeLessThan(baseConfidence);
      });
    });

    describe('getELOTier', () => {
      test('should return correct tiers for new ELO ranges', () => {
        expect(getELOTier(700).name).toBe('Unrated');
        expect(getELOTier(900).name).toBe('Novice');
        expect(getELOTier(1100).name).toBe('Learning');
        expect(getELOTier(1300).name).toBe('Beginner');
        expect(getELOTier(1500).name).toBe('Improving');
        expect(getELOTier(1700).name).toBe('Intermediate');
        expect(getELOTier(1900).name).toBe('Advanced');
        expect(getELOTier(2100).name).toBe('Expert');
        expect(getELOTier(2300).name).toBe('Master');
        expect(getELOTier(2500).name).toBe('Grandmaster');
      });

      test('should return tier with color and icon', () => {
        const tier = getELOTier(1400);
        expect(tier).toHaveProperty('name');
        expect(tier).toHaveProperty('color');
        expect(tier).toHaveProperty('icon');
        expect(typeof tier.color).toBe('string');
        expect(typeof tier.icon).toBe('string');
      });
    });

    describe('updateELO function', () => {
      test('should work with new system for backward compatibility', () => {
        const newELO = updateELO(1200, true);
        expect(newELO).toBeGreaterThan(1200);
        expect(newELO).toBeLessThanOrEqual(3000);
      });

      test('should handle losses', () => {
        const newELO = updateELO(1200, false);
        expect(newELO).toBeLessThan(1200);
        expect(newELO).toBeGreaterThanOrEqual(100);
      });
    });

    describe('sortPlayersByELO', () => {
      test('should sort players by ELO descending', () => {
        const players = [
          { id: '1', name: 'Alice', elo: 1150 },
          { id: '2', name: 'Bob', elo: 1300 },
          { id: '3', name: 'Charlie', elo: 1100 }
        ];

        const sorted = sortPlayersByELO(players);
        expect(sorted[0].name).toBe('Bob'); // Highest ELO
        expect(sorted[1].name).toBe('Alice');
        expect(sorted[2].name).toBe('Charlie'); // Lowest ELO
      });

      test('should handle missing ELO values', () => {
        const players = [
          { id: '1', name: 'Alice', wins: 5, losses: 2 },
          { id: '2', name: 'Bob', elo: 1300 }
        ];

        const sorted = sortPlayersByELO(players);
        expect(sorted[0].name).toBe('Alice'); // Higher calculated ELO (1343)
        expect(sorted[1].name).toBe('Bob'); // Lower explicit ELO (1300)
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