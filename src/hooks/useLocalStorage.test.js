import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test('should initialize with default value when no localStorage value exists', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));
    
    expect(result.current[0]).toBe('default-value');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key');
  });

  test('should initialize with localStorage value when it exists', () => {
    const storedValue = JSON.stringify('stored-value');
    localStorageMock.getItem.mockReturnValue(storedValue);
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));
    
    expect(result.current[0]).toBe('stored-value');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key');
  });

  test('should handle invalid JSON in localStorage gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json');
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));
    
    expect(result.current[0]).toBe('default-value');
  });

  test('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));
    
    act(() => {
      result.current[1]('new-value');
    });
    
    expect(result.current[0]).toBe('new-value');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'));
  });

  test('should handle complex objects', () => {
    const initialValue = { name: 'John', age: 30 };
    const { result } = renderHook(() => useLocalStorage('user', initialValue));
    
    expect(result.current[0]).toEqual(initialValue);
    
    const newValue = { name: 'Jane', age: 25 };
    act(() => {
      result.current[1](newValue);
    });
    
    expect(result.current[0]).toEqual(newValue);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(newValue));
  });

  test('should handle arrays', () => {
    const initialValue = [1, 2, 3];
    const { result } = renderHook(() => useLocalStorage('numbers', initialValue));
    
    expect(result.current[0]).toEqual(initialValue);
    
    const newValue = [4, 5, 6];
    act(() => {
      result.current[1](newValue);
    });
    
    expect(result.current[0]).toEqual(newValue);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('numbers', JSON.stringify(newValue));
  });

  test('should handle function updates', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));
    
    act(() => {
      result.current[1](prev => prev + 1);
    });
    
    expect(result.current[0]).toBe(1);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('counter', '1');
  });

  test('should handle null values', () => {
    const { result } = renderHook(() => useLocalStorage('nullable', null));
    
    expect(result.current[0]).toBe(null);
    
    act(() => {
      result.current[1]('not-null');
    });
    
    expect(result.current[0]).toBe('not-null');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('nullable', '"not-null"');
  });

  test('should handle undefined values', () => {
    const { result } = renderHook(() => useLocalStorage('undefined', undefined));
    
    expect(result.current[0]).toBe(undefined);
    
    act(() => {
      result.current[1]('defined');
    });
    
    expect(result.current[0]).toBe('defined');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('undefined', '"defined"');
  });
}); 