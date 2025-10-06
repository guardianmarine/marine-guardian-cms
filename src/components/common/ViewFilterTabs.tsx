import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViewFilter } from '@/hooks/useSoftDelete';

interface ViewFilterTabsProps {
  value: ViewFilter;
  onValueChange: (value: ViewFilter) => void;
  counts?: {
    all: number;
    active: number;
    trash: number;
  };
}

export function ViewFilterTabs({ value, onValueChange, counts }: ViewFilterTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as ViewFilter)}>
      <TabsList>
        <TabsTrigger value="active">
          Active {counts && `(${counts.active})`}
        </TabsTrigger>
        <TabsTrigger value="trash">
          Trash {counts && `(${counts.trash})`}
        </TabsTrigger>
        <TabsTrigger value="all">
          All {counts && `(${counts.all})`}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
