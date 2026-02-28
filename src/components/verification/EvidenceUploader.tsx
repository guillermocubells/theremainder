import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useEvidenceUpload, type FileWithProgress } from "@/hooks/useEvidenceUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  FileImage,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EvidenceUploaderProps {
  onUrlsReady: (urls: string[]) => void;
  maxFiles?: number;
  className?: string;
}

export default function EvidenceUploader({
  onUrlsReady,
  maxFiles = 10,
  className,
}: EvidenceUploaderProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { files, addFiles, removeFile, uploadAll, isUploading, allDone, hasErrors } =
    useEvidenceUpload();

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const incoming = Array.from(e.dataTransfer.files);
      addFiles(incoming);
    },
    [addFiles]
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files));
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const handleUpload = useCallback(async () => {
    const results = await uploadAll();
    if (results.length > 0) {
      onUrlsReady(results.map((r) => r.url));
    }
  }, [uploadAll, onUrlsReady]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          "border-border hover:border-primary/50 hover:bg-primary/5",
          files.length >= maxFiles && "opacity-50 pointer-events-none"
        )}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {t("verification.dropFiles", "Arrastra archivos o haz clic para seleccionar")}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          JPG, PNG, WebP, PDF • Máx. 5 MB • Hasta {maxFiles} archivos
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={handleSelect}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <FileRow key={f.id} file={f} onRemove={() => removeFile(f.id)} />
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && !allDone && (
        <Button
          size="sm"
          onClick={handleUpload}
          disabled={isUploading || files.every((f) => f.status === "error")}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              {t("verification.uploading", "Subiendo...")}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-1.5" />
              {t("verification.uploadAll", "Subir archivos")} ({files.filter((f) => f.status === "pending").length})
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function FileRow({ file, onRemove }: { file: FileWithProgress; onRemove: () => void }) {
  const isImage = file.file.type.startsWith("image/");
  const Icon = isImage ? FileImage : FileText;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg border text-xs",
        file.status === "error"
          ? "border-destructive/40 bg-destructive/5"
          : file.status === "done"
          ? "border-green-500/40 bg-green-500/5"
          : "border-border bg-muted/30"
      )}
    >
      {/* Thumbnail / icon */}
      {file.preview ? (
        <img
          src={file.preview}
          alt={file.file.name}
          className="h-10 w-10 rounded object-cover shrink-0"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-foreground">{file.file.name}</p>
        <p className="text-muted-foreground">
          {(file.file.size / 1024).toFixed(0)} KB
        </p>
        {file.status === "uploading" && (
          <Progress value={file.progress} className="h-1 mt-1" />
        )}
        {file.status === "error" && (
          <p className="text-destructive flex items-center gap-1 mt-0.5">
            <AlertCircle className="h-3 w-3" />
            {file.error}
          </p>
        )}
      </div>

      {/* Status / remove */}
      <div className="shrink-0">
        {file.status === "done" ? (
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : file.status === "uploading" ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Eliminar"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
