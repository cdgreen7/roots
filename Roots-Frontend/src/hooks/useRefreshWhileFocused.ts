/**
 * useRefreshWhileFocused runs refresh when the screen comes into view, then every intervalMs while it stays
 * in view. It stops when you switch to another tab or screen, so hidden screens don't keep calling the API.
 * Pass a refresh made with useCallback, or it restarts on every render.
 */
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

export function useRefreshWhileFocused(refresh: () => void, intervalMs: number) {
  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, intervalMs);
      return () => clearInterval(timer);
    }, [refresh, intervalMs]),
  );
}