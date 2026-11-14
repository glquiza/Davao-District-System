"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image format."));
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 675;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/webp", 0.82);
        resolve(compressed);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function ThumbnailUploadField({
  defaultValue = null,
  label = "Activity Thumbnail Image",
}: {
  defaultValue?: string | null;
  label?: string;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(defaultValue ?? "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (JPG, PNG, or WebP).");
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setThumbnailUrl(dataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to process image.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    void handleFileSelect(file);
  }

  return (
    <div className="rounded-xl border border-[#D6C6A5]/70 bg-[#F5F1E9]/70 p-4 space-y-3">
      <input type="hidden" name="thumbnail_url" value={thumbnailUrl} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          void handleFileSelect(e.target.files?.[0]);
          e.target.value = "";
        }}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#475048]">
            {label}
          </p>
          <p className="text-xs text-[#636B62] mt-0.5">
            Upload a poster or photo to display as the 16:9 thumbnail for this activity.
          </p>
        </div>

        {thumbnailUrl && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6C6A5] bg-white px-3 py-1.5 text-xs font-medium text-[#202820] hover:bg-[#F0ECE3]"
            >
              <Upload className="h-3.5 w-3.5 text-[#303B32]" />
              <span>Change Image</span>
            </button>
            <button
              type="button"
              onClick={() => setThumbnailUrl("")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9A69B] bg-[#FAF4F2] px-3 py-1.5 text-xs font-medium text-[#6E3429] hover:bg-[#F2E6E2]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove</span>
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <p className="text-xs font-medium text-[#6E3429] bg-[#FAF4F2] border border-[#C9A69B] rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      {thumbnailUrl ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#D6C6A5] bg-[#202820] shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt="Activity thumbnail preview"
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-full border border-[#D6C6A5]/50 bg-[#202820]/80 px-3 py-0.5 text-[11px] font-medium text-[#F5F1E9] backdrop-blur-sm">
            16:9 Activity Thumbnail Preview
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-7 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-[#303B32] bg-[#F0ECE3]"
              : "border-[#D6C6A5] bg-white hover:bg-[#F0ECE3]/60"
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D6C6A5]/60 bg-[#F0ECE3] text-[#303B32]">
            <ImagePlus className="h-5 w-5" />
          </span>
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-medium text-[#202820]">
              {isProcessing ? "Optimizing image..." : "Click to upload or drag & drop an image"}
            </p>
            <p className="text-[11px] text-[#636B62]">
              JPG, PNG, or WebP • Automatically formatted for 16:9 activity cards
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
