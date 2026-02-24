import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Upload, X, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

export function ImageUploader({ images, onImagesChange }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `plants/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("plant-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("plant-images")
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);
      }

      onImagesChange([...images, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} imagen(es) subida(s)`);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("Error al subir la imagen");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;

    try {
      new URL(urlInput);
      onImagesChange([...images, urlInput.trim()]);
      setUrlInput("");
    } catch {
      toast.error("URL no válida");
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const newImages = [...images];
    const [moved] = newImages.splice(dragIndex, 1);
    newImages.splice(toIndex, 0, moved);
    onImagesChange(newImages);
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="space-y-4">
      <Label>Imágenes</Label>

      {/* Upload area */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-moss/50 hover:bg-muted/50 transition-colors">
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {isUploading ? "Subiendo..." : "Subir imágenes"}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* URL input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="O pega una URL de imagen externa..."
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddUrl())}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleAddUrl}
          disabled={!urlInput.trim()}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Añadir
        </Button>
      </div>

      {/* Draggable image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group aspect-square rounded-xl overflow-hidden bg-muted border-2 transition-all cursor-grab active:cursor-grabbing ${
                overIndex === index && dragIndex !== index
                  ? "border-primary scale-[1.03]"
                  : dragIndex === index
                    ? "border-primary/50 opacity-50"
                    : "border-border"
              }`}
            >
              <OptimizedImage
                src={url}
                alt={`Imagen ${index + 1}`}
                className="w-full h-full object-cover pointer-events-none"
                fallbackSrc="/placeholder.svg"
              />

              {/* Delete button on hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Index badge */}
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 1 && (
        <p className="text-xs text-muted-foreground">Arrastra las imágenes para cambiar el orden. La primera imagen será la principal.</p>
      )}
    </div>
  );
}