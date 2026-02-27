import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, ImagePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface EntryPhotoUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

const EntryPhotoUploader = ({ photos, onChange, maxPhotos = 6 }: EntryPhotoUploaderProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!user || files.length === 0) return;

    const remaining = maxPhotos - photos.length;
    const toUpload = files.slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of toUpload) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/obs-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const { error } = await supabase.storage
        .from('collection-photos')
        .upload(path, file);

      if (!error) {
        const { data: signedData } = await supabase.storage
          .from('collection-photos')
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (signedData?.signedUrl) newUrls.push(signedData.signedUrl);
      }
    }

    onChange([...photos, ...newUrls]);
    setUploading(false);
  }, [user, photos, onChange, maxPhotos]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    uploadFiles(files);
  }, [uploadFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    uploadFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-2">
      {/* Preview grid */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden border border-border">
              <img
                src={photo}
                alt={`Foto ${idx + 1}`}
                className="h-20 w-20 sm:h-24 sm:w-24 object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {canAddMore && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
            'hover:border-primary/40 hover:bg-primary/5',
            dragOver
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-muted-foreground/20 bg-muted/30',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Subiendo…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
              <div>
                <p className="text-sm font-medium">Arrastra fotos aquí</p>
                <p className="text-xs">o haz clic para seleccionar · máx. {maxPhotos - photos.length} más</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EntryPhotoUploader;
