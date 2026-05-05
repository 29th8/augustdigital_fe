"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UploadService } from "@/services/upload.service";
import type { ApiErrorResponse } from "@/types/api";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function useUploadImage() {
  const [isUploading, setIsUploading] = useState(false);

  async function upload(file: File): Promise<string | null> {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Định dạng không hợp lệ. Chỉ chấp nhận JPG, PNG và WebP.");
      return null;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File quá lớn. Kích thước tối đa là 5 MB.");
      return null;
    }

    setIsUploading(true);
    try {
      const url = await UploadService.uploadImage(file);
      console.log("[useUploadImage] upload returned:", url);
      return url;
    } catch (err) {
      const message = (err as ApiErrorResponse)?.message ?? "Tải ảnh thất bại.";
      toast.error(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  return { upload, isUploading };
}
