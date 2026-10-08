import { useEffect, useState } from 'react';
import { useNavigation } from 'expo-router';

export const SUCCESS_MESSAGE_DURATION = 3000;

/** One timer per message; replacement, blur and unmount cancel it. */
export function useTemporaryFeedback(persistent = false) {
  const [dismissed, setDismissed] = useState(false);
  const navigation = useNavigation();
  useEffect(() => {
    if (persistent) return;
    const timer = setTimeout(() => setDismissed(true), SUCCESS_MESSAGE_DURATION);
    const unsubscribe = navigation.addListener('blur', () => {
      clearTimeout(timer);
      setDismissed(true);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [navigation, persistent]);
  return !dismissed;
}
