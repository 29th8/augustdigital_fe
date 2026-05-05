# API Documentation — Upload Module

**Base URL:** `http://localhost:8080`
**Updated:** 2026-05-02

---

## Known Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **Returns `201`, not `200`** | Upload uses `ApiResponse.created()` → HTTP 201. Check `res.data.code === 201`, not 200. |
| 2 | **URL is absolute** | `data.url` = `"http://localhost:8080/uploads/products/uuid.png"`. Use directly in `<img src>`. Do NOT prefix with `BASE_URL`. |
| 3 | **Do NOT set `Content-Type` manually** | Axios sets `multipart/form-data; boundary=...` automatically when you pass `FormData`. Setting it manually breaks the boundary and causes a 400 error. |
| 4 | **Field name is `file`** | The multipart form field must be named exactly `file`. Any other name returns 400. |
| 5 | **Upload before create** | The upload API and the create product API are separate calls. Upload first, get the URL, then include it in the product create/update request body as `image_url`. |

---

## Raw API Types

```typescript
// Exact JSON shape returned by the API

interface ImageUploadApi {
  url: string;   // absolute URL: "http://localhost:8080/uploads/products/{uuid}.{ext}"
}
```

## Frontend Types

```typescript
// No normalization needed — field name is already clean

interface ImageUpload {
  url: string;   // same as raw — use directly
}
```

No snake_case → camelCase conversion needed for this response. The only field is `url`.

---

## POST /api/v1/admin/upload/image

Uploads an image file to the server and returns its publicly accessible URL.

**Authentication:** ADMIN only

**Headers:**
```
Authorization: Bearer <accessToken>
// Do NOT set Content-Type — let axios handle it
```

---

### Request

**Form field name:** `file`

| Constraint | Value |
|------------|-------|
| Content types | `image/jpeg`, `image/jpg`, `image/png`, `image/webp` |
| Max file size | **5 MB** |

---

### Full Response Snapshot — `201 Created`

```json
{
  "code": 201,
  "message": "Created",
  "data": {
    "url": "http://localhost:8080/uploads/products/f47ac10b-58cc-4372-a567-0e02b2c3d479.png"
  }
}
```

---

### Accessing the Uploaded Image

After upload, the image is publicly accessible (no auth required):

```
GET http://localhost:8080/uploads/products/{filename}
```

The URL returned in `data.url` is exactly this — use it directly.

---

### Error Responses

| Code | Condition | Exact message |
|------|-----------|---------------|
| `400` | File field missing or empty | `"File must not be empty"` |
| `400` | File exceeds 5 MB | `"File size must not exceed 5MB"` |
| `400` | MIME type not allowed | `"Only jpg, jpeg, png, webp images are allowed"` |
| `401` | No token or invalid | `"Unauthorized: ..."` |
| `403` | Not ADMIN | `"Forbidden: ..."` |

```json
{
  "code": 400,
  "message": "Only jpg, jpeg, png, webp images are allowed"
}
```

---

### Frontend Usage

```typescript
// Step 1: Upload the file and get back the absolute URL
const uploadImage = async (file: File, token: string): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);   // field name MUST be "file"

  const res = await axios.post<ApiResponse<ImageUploadApi>>(
    "/api/v1/admin/upload/image",
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        // DO NOT add Content-Type here
      },
    }
  );

  // res.data.code === 201
  return res.data.data.url;  // absolute URL, ready to use
};

// Step 2: Use the URL in product creation
const handleProductCreate = async () => {
  const imageUrl = await uploadImage(selectedFile, token);  // upload first

  await axios.post("/api/v1/admin/products", {
    name: productName,
    category_id: categoryId,
    description: description,
    image_url: imageUrl,          // include the uploaded URL
    variants: variants,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
```

---

### Complete Component Pattern

```typescript
// Image upload + preview + form integration

const [imageUrl, setImageUrl] = useState<string | null>(null);
const [uploading, setUploading] = useState(false);

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploading(true);
  try {
    const url = await uploadImage(file, token);
    setImageUrl(url);  // store absolute URL in state
  } catch (err) {
    console.error("Upload failed", err);
  } finally {
    setUploading(false);
  }
};

// In JSX:
// <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} />
// {imageUrl && <img src={imageUrl} className="w-32 h-32 object-cover" />}
// On submit: include image_url: imageUrl ?? undefined in request body
```

---

### Environment Configuration

The returned URL reflects the `APP_BASE_URL` environment variable on the backend.

| Environment | Backend env var | Example URL returned |
|-------------|-----------------|----------------------|
| Development | `http://localhost:8080` (default) | `http://localhost:8080/uploads/products/abc.png` |
| Production | `https://api.yourdomain.com` | `https://api.yourdomain.com/uploads/products/abc.png` |

The frontend does not need to configure this — the full URL is always returned by the API.
