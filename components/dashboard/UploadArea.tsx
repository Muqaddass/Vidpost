"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export interface UploadedMedia {
  url: string;
  key: string;
  mediaType: "video" | "image";
  fileName: string;
  size: number;
}

interface Props {
  value: UploadedMedia | null;
  onChange: (m: UploadedMedia | null) => void;
}

const ACCEPT = {
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const MAX_BYTES = 500 * 1024 * 1024;

export function UploadArea({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES) {
        toast.error("File too large (max 500 MB)");
        return;
      }
      setUploading(true);
      setProgress(2);

      try {
        // Step 1: ask the server for a presigned PUT URL (small JSON request, no payload limit).
        const meta = await fetch("/api/post/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
          }),
        });
        if (!meta.ok) {
          const j = await meta.json().catch(() => ({}));
          throw new Error(j.error || `Could not get upload URL (${meta.status})`);
        }
        const { uploadUrl, publicUrl, key, mediaType } = await meta.json();
        setProgress(5);

        // Step 2: PUT the file bytes directly to R2 — bypasses Vercel's 4.5 MB function limit.
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(5 + Math.round((e.loaded / e.total) * 90));
          }
        };
        await new Promise<void>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`R2 upload failed (${xhr.status}): ${xhr.responseText}`));
          };
          xhr.onerror = () => reject(new Error("Network error during R2 upload"));
          xhr.send(file);
        });

        setProgress(100);
        onChange({
          url: publicUrl,
          key,
          mediaType,
          fileName: file.name,
          size: file.size,
        });
        toast.success("Upload complete");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
        setTimeout(() => setProgress(0), 600);
      }
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    multiple: false,
    maxSize: MAX_BYTES,
    onDrop: (files) => files[0] && handleFile(files[0]),
    disabled: uploading || !!value,
  });

  if (value) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-4">
          {value.mediaType === "video" ? (
            <video src={value.url} className="aspect-video w-40 rounded-md bg-black object-cover" muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.url} alt={value.fileName} className="aspect-video w-40 rounded-md object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium">{value.fileName}</p>
            <p className="text-sm text-muted-foreground">
              {(value.size / 1024 / 1024).toFixed(1)} MB · {value.mediaType}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Remove">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition ${
        isDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
      }`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <>
          <Loader2 className="mb-3 size-8 animate-spin text-primary" />
          <p className="mb-3 text-sm font-medium">Uploading…</p>
          <div className="w-full max-w-xs">
            <Progress value={progress} />
          </div>
        </>
      ) : (
        <>
          <UploadCloud className="mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">
            {isDragActive ? "Drop the file here" : "Drag & drop or click to upload"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            MP4, MOV, JPG, PNG — up to 500 MB
          </p>
        </>
      )}
    </div>
  );
}
