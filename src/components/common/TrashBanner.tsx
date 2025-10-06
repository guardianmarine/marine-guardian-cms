import { AlertCircle, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface TrashBannerProps {
  onRestore: () => void;
  loading?: boolean;
}

export function TrashBanner({ onRestore, loading }: TrashBannerProps) {
  return (
    <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-900 dark:text-yellow-100">
        This record is in the Trash
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span className="text-yellow-800 dark:text-yellow-200">
          This record has been deleted and is only visible to staff.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onRestore}
          disabled={loading}
          className="ml-4"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Restore
        </Button>
      </AlertDescription>
    </Alert>
  );
}
