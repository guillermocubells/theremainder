import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 10;

export interface UploadedEvidence {
  path: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

export interface FileWithProgress {
  file: File;
  id: string;
  preview: string | null;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  result?: UploadedEvidence;
}

export function useEvidenceUpload() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const abortRef = useRef<Map<string, AbortController>>(new Map());

  const validate = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Tipo no permitido: ${file.type}. Usa JPG, PNG, WebP o PDF.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo 5 MB.`;
    }
    return null;
  }, []);

  const addFiles = useCallback(
    (incoming: File[]) => {
      setFiles((prev) => {
        const remaining = MAX_FILES - prev.length;
        if (remaining <= 0) {
          toast.error(`Máximo ${MAX_FILES} archivos`);
          return prev;
        }
        const toAdd = incoming.slice(0, remaining);
        const newEntries: FileWithProgress[] = toAdd.map((file) => {
          const validationError = validate(file);
          const preview =
            file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
          return {
            file,
            id: crypto.randomUUID(),
            preview,
            progress: 0,
            status: validationError ? "error" : "pending",
            error: validationError ?? undefined,
          };
        });
        return [...prev, ...newEntries];
      });
    },
    [validate]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      abortRef.current.get(id)?.abort();
      abortRef.current.delete(id);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const uploadAll = useCallback(async (): Promise<UploadedEvidence[]> => {
    if (!user) {
      toast.error("Inicia sesión para subir archivos");
      return [];
    }

    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) {
      return files.filter((f) => f.status === "done").map((f) => f.result!);
    }

    const results: UploadedEvidence[] = files
      .filter((f) => f.status === "done" && f.result)
      .map((f) => f.result!);

    for (const entry of pending) {
      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, status: "uploading", progress: 10 } : f))
      );

      const ext = entry.file.name.split(".").pop() ?? "bin";
      const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      try {
        setFiles((prev) =>
          prev.map((f) => (f.id === entry.id ? { ...f, progress: 30 } : f))
        );

        const { error: uploadError } = await supabase.storage
          .from("verification-evidence")
          .upload(storagePath, entry.file, {
            contentType: entry.file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        setFiles((prev) =>
          prev.map((f) => (f.id === entry.id ? { ...f, progress: 80 } : f))
        );

        const { data: signedData, error: signedError } = await supabase.storage
          .from("verification-evidence")
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

        if (signedError) throw signedError;

        const result: UploadedEvidence = {
          path: storagePath,
          url: signedData.signedUrl,
          name: entry.file.name,
          size: entry.file.size,
          type: entry.file.type,
        };

        results.push(result);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id ? { ...f, status: "done", progress: 100, result } : f
          )
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: "error", error: err.message ?? "Error al subir", progress: 0 }
              : f
          )
        );
      }
    }

    return results;
  }, [files, user]);

  const reset = useCallback(() => {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    abortRef.current.forEach((c) => c.abort());
    abortRef.current.clear();
    setFiles([]);
  }, [files]);

  const completedUrls = files
    .filter((f) => f.status === "done" && f.result)
    .map((f) => f.result!.url);

  return {
    files,
    addFiles,
    removeFile,
    uploadAll,
    reset,
    completedUrls,
    hasErrors: files.some((f) => f.status === "error"),
    isUploading: files.some((f) => f.status === "uploading"),
    allDone: files.length > 0 && files.every((f) => f.status === "done"),
  };
}
