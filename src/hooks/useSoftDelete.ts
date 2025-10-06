import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type SoftDeleteTable = 'accounts' | 'contacts' | 'leads' | 'opportunities' | 'units';

export type ViewFilter = 'all' | 'active' | 'trash';

export function useSoftDelete(table: SoftDeleteTable) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const moveToTrash = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('move_to_trash', {
        _table: table,
        _id: id,
      });

      if (error) throw error;

      // Log action (minimal telemetry without PII)
      const idHash = id.slice(-8);
      console.info(`[Soft Delete] Moved ${table} record (${idHash}) to trash`);

      toast({
        title: 'Moved to trash',
        description: 'Record has been moved to trash',
      });

      return true;
    } catch (error: any) {
      console.error('[Soft Delete] Move to trash failed:', error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to move record to trash',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const restoreFromTrash = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('restore_from_trash', {
        _table: table,
        _id: id,
      });

      if (error) throw error;

      const idHash = id.slice(-8);
      console.info(`[Soft Delete] Restored ${table} record (${idHash}) from trash`);

      toast({
        title: 'Restored',
        description: 'Record has been restored',
      });

      return true;
    } catch (error: any) {
      console.error('[Soft Delete] Restore failed:', error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore record',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const hardDelete = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('hard_delete', {
        _table: table,
        _id: id,
      });

      if (error) throw error;

      const idHash = id.slice(-8);
      console.info(`[Soft Delete] Permanently deleted ${table} record (${idHash})`);

      toast({
        title: 'Permanently deleted',
        description: 'Record has been permanently deleted',
      });

      return true;
    } catch (error: any) {
      console.error('[Soft Delete] Hard delete failed:', error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete record',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    moveToTrash,
    restoreFromTrash,
    hardDelete,
    loading,
  };
}
