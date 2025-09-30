import { useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useContentStore } from '@/services/contentStore';
import { MediaAsset } from '@/types';
import { Upload, Search, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function MediaLibrary() {
  const { mediaAssets, addMediaAsset, updateMediaAsset, deleteMediaAsset } = useContentStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [altEn, setAltEn] = useState('');
  const [altEs, setAltEs] = useState('');
  const { toast } = useToast();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 10MB limit`,
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const newAsset: MediaAsset = {
          id: Math.random().toString(36).substr(2, 9),
          file_url: reader.result as string,
          width: 1200,
          height: 800,
          mime: file.type,
          size_kb: Math.round(file.size / 1024),
          alt_en: file.name.replace(/\.[^/.]+$/, ''),
          alt_es: file.name.replace(/\.[^/.]+$/, ''),
          tags: [],
          created_by: '1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        addMediaAsset(newAsset);
        toast({
          title: 'Media uploaded',
          description: `${file.name} has been added to the library`,
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleEdit = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setAltEn(asset.alt_en || '');
    setAltEs(asset.alt_es || '');
  };

  const handleSaveEdit = () => {
    if (editingAsset) {
      updateMediaAsset(editingAsset.id, { alt_en: altEn, alt_es: altEs });
      toast({
        title: 'Media updated',
        description: 'Alt text has been updated',
      });
      setEditingAsset(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this media asset?')) {
      deleteMediaAsset(id);
      toast({
        title: 'Media deleted',
        description: 'The media asset has been removed',
      });
    }
  };

  const filteredAssets = mediaAssets.filter((asset) =>
    (asset.alt_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.alt_es?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Media Library</h2>
            <p className="text-muted-foreground">Upload and manage images for your content</p>
          </div>
          <div>
            <label htmlFor="upload">
              <Button asChild>
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Media
                </span>
              </Button>
            </label>
            <input
              id="upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name or tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredAssets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {mediaAssets.length === 0
                    ? 'No media assets yet. Upload some images to get started!'
                    : 'No media found matching your search.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAssets.map((asset) => (
                  <div key={asset.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={asset.file_url}
                        alt={asset.alt_en || ''}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleEdit(asset)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDelete(asset.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-medium truncate">{asset.alt_en}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{asset.size_kb}KB</span>
                        <Badge variant="outline">{asset.mime.split('/')[1]}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingAsset} onOpenChange={() => setEditingAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
          </DialogHeader>
          {editingAsset && (
            <div className="space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={editingAsset.file_url}
                  alt={editingAsset.alt_en || ''}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alt-en">Alt Text (English)</Label>
                <Input
                  id="alt-en"
                  value={altEn}
                  onChange={(e) => setAltEn(e.target.value)}
                  placeholder="Describe the image in English"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alt-es">Alt Text (Spanish)</Label>
                <Input
                  id="alt-es"
                  value={altEs}
                  onChange={(e) => setAltEs(e.target.value)}
                  placeholder="Describe la imagen en español"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAsset(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BackofficeLayout>
  );
}
