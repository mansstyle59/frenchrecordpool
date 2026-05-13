import { useRef, useState, type DragEvent } from "react";
import { Upload, CheckCircle2, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  accept?: string;
  file: File | null;
  onFile: (file: File | null) => void;
  label?: string;
  helper?: string;
  validate?: (file: File) => string | null;
  progress?: number; // 0-100
  uploading?: boolean;
  preview?: string; // image preview url
  className?: string;
}

export default function FileDropzone({
  accept,
  file,
  onFile,
  label,
  helper,
  validate,
  progress,
  uploading,
  preview,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      onFile(null);
      return;
    }
    if (validate) {
      const err = validate(f);
      if (err) {
        setError(err);
        return;
      }
    }
    onFile(f);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className={cn("space-y-1", className)}>
      {label && <p className="text-sm font-medium">{label}</p>}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-lg px-4 py-6 cursor-pointer transition-all bg-secondary/30",
          "hover:border-primary/60 hover:bg-secondary/50",
          dragActive && "border-primary bg-primary/5",
          file && !error && "border-primary/40",
          error && "border-destructive"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center gap-3">
            {preview ? (
              <img src={preview} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
            ) : uploading ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
                {typeof progress === "number" && uploading && ` · ${progress}%`}
              </p>
              {typeof progress === "number" && uploading && (
                <div className="mt-1 h-1 bg-secondary rounded overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
            {!uploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFile(null);
                }}
                className="text-muted-foreground hover:text-destructive shrink-0"
                aria-label="Retirer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-1">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">
              <span className="text-primary font-medium">Cliquez</span> ou glissez un fichier
            </p>
            {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
