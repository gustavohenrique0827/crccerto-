import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export function useAuthGuard() {
  const { user } = useApp();

  // This hook can be expanded for more complex route logic
  // but for now, it simply provides a central place to check auth status
  return {
    isAuthenticated: !!user,
    user
  };
}
