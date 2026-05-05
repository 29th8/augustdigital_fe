const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function resolveImageUrl(imageUrl: string | undefined | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  // Relative path — prepend API base URL
  const path = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${API_URL}${path}`;
}
