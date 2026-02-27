import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { OptimizedImage } from "@/components/ui/optimized-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Upload, X, Link as LinkIcon, Loader2, MoreVertical, Package, Star, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  productImages?: string[];
  onProductImagesChange?: (productImages: string[]) => void;
  primaryImage?: string;
  onPrimaryImageChange?: (primaryImage: string | null) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

export function ImageUploader({
  images,
  onImagesChange,
  productImages = [],
  onProductImagesChange,
  primaryImage,
  onPrimaryImageChange,
}: ImageUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading = uploadingFiles.some((f) => !f.error && f.progress < 100);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `"${file.name}" no es un formato válido (usa JPG, PNG, WebP)`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `"${file.name}" supera los 10 MB`;
    }
    return null;
  };

  const uploadSingleFile = async (file: File, fileId: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `plants/${fileName}`;

    // Simulate progress since Supabase SDK doesn't expose upload progress
    const progressInterval = setInterval(() => {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId && f.progress < 90
            ? { ...f, progress: Math.min(f.progress + 15 + Math.random() * 20, 90) }
            : f
        )
      );
    }, 200);

    try {
      const { error: uploadError } = await supabase.storage
        .from("plant-images")
        .upload(filePath, file);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("plant-images")
        .getPublicUrl(filePath);

      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, progress: 100 } : f))
      );

      return urlData.publicUrl;
    } catch (error: any) {
      clearInterval(progressInterval);
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, error: error.message || "Error al subir", progress: 0 } : f
        )
      );
      return null;
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Validate all files first
    const validFiles: { file: File; id: string }[] = [];
    for (const file of fileArray) {
      const err = validateFile(file);
      if (err) {
        toast.error(err);
      } else {
        const id = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
        validFiles.push({ file, id });
      }
    }

    if (validFiles.length === 0) return;

    // Add to uploading state
    setUploadingFiles((prev) => [
      ...prev,
      ...validFiles.map(({ file, id }) => ({
        id,
        name: file.name,
        progress: 0,
      })),
    ]);

    // Upload all in parallel
    const results = await Promise.all(
      validFiles.map(({ file, id }) => uploadSingleFile(file, id))
    );

    const uploadedUrls = results.filter(Boolean) as string[];
    if (uploadedUrls.length > 0) {
      onImagesChange([...images, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} imagen(es) subida(s)`);
    }

    // Clean completed uploads after a delay
    setTimeout(() => {
      setUploadingFiles((prev) => prev.filter((f) => f.error));
    }, 1500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
      e.target.value = "";
    }
  };

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
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
    const removedUrl = images[index];
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    if (onProductImagesChange && productImages.includes(removedUrl)) {
      onProductImagesChange(productImages.filter((u) => u !== removedUrl));
    }
    if (onPrimaryImageChange && primaryImage === removedUrl) {
      onPrimaryImageChange(null);
    }
  };

  const handleToggleProduct = (url: string) => {
    if (!onProductImagesChange) return;
    const isProduct = productImages.includes(url);
    if (isProduct) {
      onProductImagesChange(productImages.filter((u) => u !== url));
      if (onPrimaryImageChange && primaryImage === url) {
        onPrimaryImageChange(null);
      }
    } else {
      onProductImagesChange([...productImages, url]);
    }
  };

  const handleSetPrimary = (url: string) => {
    if (!onPrimaryImageChange || !onProductImagesChange) return;
    onPrimaryImageChange(url);
    if (!productImages.includes(url)) {
      onProductImagesChange([...productImages, url]);
    }
  };

  const handleDragStart = (index: number) => setDragIndex(index);
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

  const dismissError = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const hasProductFeature = !!onProductImagesChange;

  return (
    <div className="space-y-4">
      <Label>Imágenes</Label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDropZone}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-moss/50 hover:bg-muted/50"
        }`}
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">
          {isUploading ? "Subiendo..." : "Arrastra imágenes aquí o haz clic para seleccionar"}
        </span>
        <span className="text-xs text-muted-foreground">JPG, PNG, WebP · máx. 10 MB</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* Upload progress indicators */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((f) => (
            <div key={f.id} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">{f.name}</span>
              {f.error ? (
                <div className="flex items-center gap-2 flex-1">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                  <span className="text-xs text-destructive truncate">{f.error}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-auto"
                    onClick={() => dismissError(f.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Progress value={f.progress} className="flex-1 h-2" indicatorClassName={f.progress === 100 ? "bg-moss" : ""} />
              )}
            </div>
          ))}
        </div>
      )}

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
          {images.map((url, index) => {
            const isProduct = productImages.includes(url);
            const isPrimary = primaryImage === url;

            return (
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
                      : isPrimary
                        ? "border-primary"
                        : isProduct
                          ? "border-accent-foreground/30"
                          : "border-border"
                }`}
              >
                <OptimizedImage
                  src={url}
                  alt={`Imagen ${index + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                  fallbackSrc="/placeholder.svg"
                />

                {/* Badges */}
                {hasProductFeature && (isPrimary || isProduct) && (
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {isPrimary && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5" />
                        Principal
                      </span>
                    )}
                    {isProduct && !isPrimary && (
                      <span className="bg-accent text-accent-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Package className="h-2.5 w-2.5" />
                        Producto
                      </span>
                    )}
                  </div>
                )}

                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {hasProductFeature && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleToggleProduct(url)}>
                          <Package className="h-4 w-4 mr-2" />
                          {isProduct ? "Quitar producto" : "Marcar como producto"}
                        </DropdownMenuItem>
                        {!isPrimary && (
                          <DropdownMenuItem onClick={() => handleSetPrimary(url)}>
                            <Star className="h-4 w-4 mr-2" />
                            Hacer principal
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Index badge */}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {images.length > 1 && (
        <p className="text-xs text-muted-foreground">Arrastra las imágenes para cambiar el orden. La primera imagen será la principal.</p>
      )}
    </div>
  );
}
