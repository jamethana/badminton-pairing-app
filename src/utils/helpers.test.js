import { generateId, shuffleArray, getTimeAgo } from './helpers';

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
}); 