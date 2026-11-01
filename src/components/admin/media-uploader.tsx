"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, LoaderCircle } from "lucide-react";
import type { MediaAsset } from "@/lib/types";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_MB = MAX_BYTES / (1024 * 1024);

export function MediaUploader({
  onUploaded,
  compact = false,
}: {
  onUploaded?: (asset: MediaAsset) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const fileId = `${fieldId}-file`;
  const altId = `${fieldId}-alt`;
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function upload() {
    setError("");
    setMessage("");
    if (!file) {
      setError("Choose an image first.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Images must be ${MAX_MB} MB or smaller.`);
      return;
    }
    if (alt.trim().length < 2) {
      setError("Describe what is in the image (alt text).");
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("alt", alt.trim());
    setBusy(true);
    try {
      const response = await fetch("/api/admin/media", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as
        | { asset?: MediaAsset; error?: string }
        | null;
      if (!response.ok || !payload?.asset) {
        setError(payload?.error ?? "The image could not be uploaded.");
        return;
      }
      setFile(null);
      setAlt("");
      if (inputRef.current) inputRef.current.value = "";
      setMessage("Image added.");
      if (onUploaded) onUploaded(payload.asset);
      else router.refresh();
    } catch {
      setError("The image could not be uploaded. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "space-y-3" : "surface space-y-3 p-4"}>
      <div>
        <label htmlFor={fileId} className="label">
          Upload a photograph
        </label>
        <input
          ref={inputRef}
          id={fileId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError("");
            setMessage("");
          }}
          className="block w-full text-[0.875rem] text-ink-soft file:mr-3 file:cursor-pointer file:rounded-sm file:border file:border-line-strong file:bg-paper file:px-3 file:py-1.5 file:text-[0.8125rem] file:font-medium file:text-ink hover:file:border-ink"
        />
        <p className="help">JPG, PNG, WebP or AVIF · up to {MAX_MB} MB.</p>
      </div>

      <div>
        <label htmlFor={altId} className="label">
          Image description (alt text)
        </label>
        <input
          id={altId}
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          maxLength={240}
          placeholder="e.g. Groundnut chikki cut into squares"
          className="field"
        />
        <p className="help">Used by screen readers and when the image cannot load.</p>
      </div>

      {error ? (
        <p role="alert" className="error-text">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-[0.8125rem] font-medium text-olive">
          {message}
        </p>
      ) : null}

      <button type="button" onClick={upload} disabled={busy} className="btn btn-outline btn-sm">
        {busy ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <ImageUp aria-hidden="true" className="size-4" />
        )}
        {busy ? "Uploading…" : "Upload image"}
      </button>
    </div>
  );
}
