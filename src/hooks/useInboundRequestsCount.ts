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

    // Set up realtime subscription
    const channel = supabase
      .channel('buyer_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyer_requests',
        },
        () => {
          // Refresh count on any change
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
