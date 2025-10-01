import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useInboundRequestsCount() {
  const [count, setCount] = useState<number>(0);

  const fetchCount = async () => {
    try {
      const { count: newCount, error } = await supabase
        .from('buyer_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new');

      if (error) {
        console.error('Error fetching inbound requests count:', error);
        return;
      }

      setCount(newCount ?? 0);
    } catch (err) {
      console.error('Failed to fetch inbound requests count:', err);
      // Fail-safe: don't show badge on error
      setCount(0);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchCount, 30000);

    return () => clearInterval(interval);
  }, []);

  return count;
}
