"use client";

import { useRef, useState, useCallback } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useUploadImage } from "@/hooks/useUploadImage";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onUpload: (url: string) => void;
  onClear?: () => void;
  onUploadStart?: () => void;
}

export default function ImageUpload({ value, onUpload, onClear, onUploadStart }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { upload, isUploading } = useUploadImage();

  const handleFile = useCallback(
    async (file: File) => {
      onUploadStart?.();
      const url = await upload(file);
      if (url) onUpload(url);
    },
    [upload, onUpload, onUploadStart]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // reset so the same file can be re-selected after clearing
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const previewSrc = value ?? null;

  if (previewSrc) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewSrc} alt="Product preview" className="w-full h-full object-cover" />
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 flex items-center justify-center h-7 w-7 rounded-full bg-white/90 border border-gray-200 text-gray-600 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
            aria-label="Xóa ảnh"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleInputChange}
        aria-label="Tải ảnh sản phẩm"
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !isUploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex flex-col items-center justify-center gap-3 w-full aspect-video rounded-xl border-2 border-dashed transition-colors cursor-pointer select-none",
          isDragging
            ? "border-cyan-400 bg-cyan-50"
            : "border-gray-200 bg-gray-50 hover:border-cyan-300 hover:bg-cyan-50/50",
          isUploading && "pointer-events-none opacity-70"
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
            <p className="text-sm text-gray-500">Đang tải lên…</p>
          </>
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-gray-300" />
            <div className="flex flex-col items-center gap-0.5 text-center">
              <p className="text-sm font-medium text-gray-600">
                Nhấn hoặc kéo &amp; thả ảnh vào đây
              </p>
              <p className="text-xs text-gray-400">JPG, PNG, WebP — tối đa 5 MB</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
