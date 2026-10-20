import { useEffect, useState } from 'react';

// Current time as a render-safe value. Reading Date.now() directly during render
// is impure (react-hooks/purity); this captures it once and refreshes on an interval.
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
