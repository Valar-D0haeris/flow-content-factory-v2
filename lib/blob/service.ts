import { put, del, head } from "@vercel/blob";

export interface BlobUploadOptions {
  token?: string;
  folder?: string;
  isPrivateStore?: boolean;
}

export interface UploadResult {
  url: string;
  pathname: string;
  contentType?: string;
}

/**
 * Uploads a file buffer or string to Vercel Blob storage.
 * Gracefully adapts between public and private Vercel Blob store configurations.
 */
export async function uploadToBlob(
  filename: string,
  content: string | Buffer | Blob,
  options: BlobUploadOptions = {}
): Promise<UploadResult> {
  const token = options.token || process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  const targetPath = options.folder ? `${options.folder}/${filename}` : filename;

  try {
    // Try public store mode first
    const blob = await put(targetPath, content, {
      access: "public",
      token,
      addRandomSuffix: true,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    };
  } catch (err: any) {
    if (err.message && err.message.includes("private store")) {
      // Fallback for private store configuration
      const blob = await put(targetPath, content, {
        token,
        addRandomSuffix: true,
      } as any);
      return {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
      };
    }
    throw err;
  }
}

/**
 * Deletes a file from Vercel Blob storage.
 */
export async function deleteFromBlob(url: string, token?: string): Promise<boolean> {
  const authToken = token || process.env.BLOB_READ_WRITE_TOKEN;
  if (!authToken) return false;

  try {
    await del(url, { token: authToken });
    return true;
  } catch (err) {
    console.warn("Failed to delete blob:", err);
    return false;
  }
}
