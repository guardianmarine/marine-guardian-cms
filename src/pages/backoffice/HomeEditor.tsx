import { useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContentStore } from '@/services/contentStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Locale, UnitCategory } from '@/types';
import { Save, Eye } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export default function HomeEditor() {
  const { user } = useAuth();
  const { heroBlocks, featuredPicks, updateHeroBlock, publishHeroBlock, updateFeaturedPicks } = useContentStore();
  const { toast } = useToast();
  const [activeLocale, setActiveLocale] = useState<Locale>('en');
  const [previewMode, setPreviewMode] = useState(false);

  const currentHero = heroBlocks[activeLocale];

  const handleSaveHero = () => {
    toast({
      title: 'Hero saved',
      description: 'Changes saved successfully',
    });
  };

  const handlePublishHero = () => {
    if (user?.role !== 'admin') {
      toast({
        title: 'Permission denied',
        description: 'Only admins can publish content',
        variant: 'destructive',
      });
      return;
    }
    publishHeroBlock(activeLocale);
    toast({
      title: 'Hero published',
      description: 'Hero block is now live',
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = featuredPicks.findIndex((pick) => pick.id === active.id);
      const newIndex = featuredPicks.findIndex((pick) => pick.id === over.id);
      const newPicks = arrayMove(featuredPicks, oldIndex, newIndex).map((pick, idx) => ({
        ...pick,
        sort: idx,
      }));
      updateFeaturedPicks(newPicks);
      toast({
        title: 'Order updated',
        description: 'Featured picks reordered',
      });
    }
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Home Editor</h2>
            <p className="text-muted-foreground">Edit hero, carousels, and featured content</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            {user?.role === 'admin' && (
              <Button onClick={handlePublishHero}>Publish All</Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="hero">
          <TabsList>
            <TabsTrigger value="hero">Hero Block</TabsTrigger>
            <TabsTrigger value="featured">Featured Picks</TabsTrigger>
          </TabsList>

          {/* Hero Block Editor */}
          <TabsContent value="hero">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Hero Block</CardTitle>
                    <CardDescription>Edit the main hero section on the home page</CardDescription>
                  </div>
                  <Select value={activeLocale} onValueChange={(v) => setActiveLocale(v as Locale)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={currentHero.title}
                    onChange={(e) =>
                      updateHeroBlock(activeLocale, { title: e.target.value })
                    }
                    placeholder="Enter hero title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Textarea
                    id="subtitle"
                    value={currentHero.subtitle}
                    onChange={(e) =>
                      updateHeroBlock(activeLocale, { subtitle: e.target.value })
                    }
                    placeholder="Enter hero subtitle"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-cta">Primary CTA Label</Label>
                    <Input
                      id="primary-cta"
                      value={currentHero.primary_cta_label}
                      onChange={(e) =>
                        updateHeroBlock(activeLocale, { primary_cta_label: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primary-url">Primary CTA URL</Label>
                    <Input
                      id="primary-url"
                      value={currentHero.primary_cta_url}
                      onChange={(e) =>
                        updateHeroBlock(activeLocale, { primary_cta_url: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-search"
                    checked={currentHero.show_search}
                    onCheckedChange={(checked) =>
                      updateHeroBlock(activeLocale, { show_search: checked })
                    }
                  />
                  <Label htmlFor="show-search">Show search overlay</Label>
                </div>

                {currentHero.show_search && (
                  <div className="space-y-2">
                    <Label htmlFor="search-tab">Default search tab</Label>
                    <Select
                      value={currentHero.search_tab}
                      onValueChange={(v) =>
                        updateHeroBlock(activeLocale, { search_tab: v as UnitCategory })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="truck">Trucks</SelectItem>
                        <SelectItem value="trailer">Trailers</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button onClick={handleSaveHero}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Featured Picks Editor */}
          <TabsContent value="featured">
            <Card>
              <CardHeader>
                <CardTitle>Featured Picks</CardTitle>
                <CardDescription>
                  Drag to reorder. These units will appear on the home page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {featuredPicks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No featured picks yet. Add units from the inventory admin.</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={featuredPicks.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {featuredPicks.map((pick) => (
                          <SortableFeaturedItem key={pick.id} pick={pick} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}

function SortableFeaturedItem({ pick }: { pick: any }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: pick.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-3 p-3 bg-muted rounded-lg"
    >
      <button {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      <div className="flex-1">
        <p className="font-medium">
          {pick.unit?.year} {pick.unit?.make} {pick.unit?.model}
        </p>
        <p className="text-sm text-muted-foreground">{pick.unit?.type}</p>
      </div>
    </div>
  );
}
