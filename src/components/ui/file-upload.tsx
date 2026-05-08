"use client"

import * as React from "react"
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { apiUploadFile } from "@/lib/client/api"
import { toast } from "sonner"

// ============================================================
// Per-file upload status tracking
// ============================================================

type UploadStatus = "idle" | "uploading" | "success" | "error"

interface FileWithStatus {
  file: File
  status: UploadStatus
  fileUrl?: string
  errorMessage?: string
}

// ============================================================
// Props
// ============================================================

interface FileUploadProps {
  /** Currently selected files (local, before upload) */
  value?: File[]
  /** Called when the user adds/removes files from the local list */
  onChange?: (files: File[]) => void
  /** MIME types to accept */
  accept?: string
  /** Allow multiple file selection */
  multiple?: boolean
  /** Disable the entire component */
  disabled?: boolean
  /** Maximum file size in MB per file */
  maxSizeMb?: number
  /** Extra CSS classes */
  className?: string

  // --- Upload wiring (P1-03) ---

  /** When true, files are uploaded automatically upon selection */
  autoUpload?: boolean
  /** ERP doctype to attach the uploaded file to */
  doctype?: string
  /** ERP docname to attach the uploaded file to */
  docname?: string
  /** Called when a single file uploads successfully */
  onUploadComplete?: (result: { file_url: string }, file: File) => void
  /** Called when a single file upload fails */
  onUploadError?: (error: Error, file: File) => void
}

// ============================================================
// Component
// ============================================================

/** رفع ملفات عبر النقر أو السحب والإفلات مع دعم الرفع الفعلي عبر apiUploadFile (fixsystem P1-03). */
export function FileUpload({
  value = [],
  onChange,
  accept,
  multiple = true,
  disabled,
  maxSizeMb = 10,
  className,
  autoUpload = false,
  doctype,
  docname,
  onUploadComplete,
  onUploadError,
}: FileUploadProps) {
  const [isOver, setIsOver] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Per-file upload status tracking — keyed by file name + size + lastModified
  const [uploadStatuses, setUploadStatuses] = React.useState<
    Map<string, FileWithStatus>
  >(new Map())

  // Stable key for a File object
  const fileKey = (f: File) => `${f.name}-${f.size}-${f.lastModified}`

  // Whether any file is currently uploading
  const isUploading = React.useMemo(() => {
    for (const v of uploadStatuses.values()) {
      if (v.status === "uploading") return true
    }
    return false
  }, [uploadStatuses])

  // Get the status of a specific file
  const getStatus = (f: File): FileWithStatus | undefined =>
    uploadStatuses.get(fileKey(f))

  // Upload a single file
  const uploadFile = React.useCallback(
    async (file: File) => {
      const key = fileKey(file)
      setUploadStatuses((prev) => {
        const next = new Map(prev)
        next.set(key, { file, status: "uploading" })
        return next
      })

      try {
        const result = await apiUploadFile(file, doctype, docname)
        if (result) {
          setUploadStatuses((prev) => {
            const next = new Map(prev)
            next.set(key, { file, status: "success", fileUrl: result.file_url })
            return next
          })
          toast.success("تم رفع الملف بنجاح", {
            description: file.name,
          })
          onUploadComplete?.(result, file)
        } else {
          throw new Error("لم يتم إرجاع رابط الملف")
        }
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "خطأ غير معروف"
        setUploadStatuses((prev) => {
          const next = new Map(prev)
          next.set(key, { file, status: "error", errorMessage: errMsg })
          return next
        })
        toast.error("فشل رفع الملف", {
          description: `${file.name}: ${errMsg}`,
        })
        onUploadError?.(
          error instanceof Error ? error : new Error(errMsg),
          file
        )
      }
    },
    [doctype, docname, onUploadComplete, onUploadError]
  )

  // Merge incoming files into the list, optionally auto-upload
  const mergeFiles = (incoming: FileList | null) => {
    if (!incoming || disabled) return
    const maxBytes = maxSizeMb * 1024 * 1024
    const filtered = Array.from(incoming).filter((f) => {
      if (f.size > maxBytes) {
        toast.error("تجاوز الملف الحجم المسموح", {
          description: `${f.name} يتجاوز ${maxSizeMb}MB`,
        })
        return false
      }
      return true
    })
    if (filtered.length === 0) return

    const next = multiple ? [...value, ...filtered] : filtered.slice(0, 1)
    onChange?.(next)

    // Auto-upload each new file
    if (autoUpload) {
      for (const file of filtered) {
        uploadFile(file)
      }
    }
  }

  const removeAt = (idx: number) => {
    const file = value[idx]
    if (file) {
      // Clean up upload status
      const key = fileKey(file)
      setUploadStatuses((prev) => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
    }
    onChange?.(value.filter((_, i) => i !== idx))
  }

  // Retry a failed upload
  const retryUpload = (file: File) => {
    uploadFile(file)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        disabled={disabled || isUploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled && !isUploading) setIsOver(true)
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsOver(false)
          mergeFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md-ui)] border border-dashed border-border/40 bg-muted/20 px-4 py-6 text-sm transition-colors",
          "hover:border-border/60 hover:bg-accent/25",
          isOver && "border-primary bg-primary/10",
          (disabled || isUploading) && "cursor-not-allowed opacity-60"
        )}
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
        <p className="font-medium">
          {isUploading ? "جارٍ رفع الملف..." : "اسحب الملفات هنا أو اضغط للاختيار"}
        </p>
        <p className="text-xs text-muted-foreground">
          الحجم الأقصى لكل ملف: {maxSizeMb}MB
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        accept={accept}
        onChange={(e) => mergeFiles(e.target.files)}
      />

      {value.length > 0 ? (
        <div className="space-y-1.5">
          {value.map((file, idx) => {
            const status = getStatus(file)
            const isFileUploading = status?.status === "uploading"
            const isFileSuccess = status?.status === "success"
            const isFileError = status?.status === "error"

            return (
              <div
                key={`${file.name}-${idx}`}
                className={cn(
                  "flex items-center justify-between rounded-[var(--radius-sm-ui)] border px-3 py-2 text-xs",
                  isFileError
                    ? "border-destructive/40 bg-destructive/5"
                    : isFileSuccess
                      ? "border-success/40 bg-success/5"
                      : "border-border/40 bg-[color:var(--surface)]"
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
                  {/* Status icon */}
                  {isFileUploading && (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                  )}
                  {isFileSuccess && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                  )}
                  {isFileError && (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                  )}

                  <div className="truncate">
                    <span className="font-medium">{file.name}</span>
                    <span className="ms-2 text-muted-foreground">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                    {isFileSuccess && status?.fileUrl && (
                      <span className="ms-2 text-success">
                        — تم الرفع ✓
                      </span>
                    )}
                    {isFileError && status?.errorMessage && (
                      <span className="ms-1 text-destructive">
                        — {status.errorMessage}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {isFileError && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary"
                      onClick={() => retryUpload(file)}
                      title="إعادة المحاولة"
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeAt(idx)}
                    disabled={isFileUploading}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
