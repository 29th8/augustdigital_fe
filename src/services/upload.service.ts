import axios from "axios";
import { z } from "zod";
import useAuthStore from "@/store/useAuthStore";
import { parseApiResponse } from "@/lib/parseApiResponse";
import type { ApiResponse } from "@/types/api";

const UploadDataSchema = z.object({
  url: z.string(),
});

export const UploadService = {
  async uploadImage(file: File): Promise<string> {
    const token = useAuthStore.getState().token;
    const formData = new FormData();
    formData.append("file", file);

    // Standalone axios instance — NOT apiClient — so the Content-Type header
    // is NOT set to application/json. Axios will auto-set multipart/form-data
    // with the correct boundary when given FormData.
    const res = await axios.post<ApiResponse<unknown>>(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/upload/image`,
      formData,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const { url } = parseApiResponse(UploadDataSchema, res.data.data, "uploadImage");
    return url;
  },
};
