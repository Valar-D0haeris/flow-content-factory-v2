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
 * Uploads a file buffer or string to Vercel Blob storage with explicit timeout.
 * Gracefully adapts between public and private Vercel Blob store configurations.
 */
export async function uploadToBlob(
  filename: string,
  content: string | Buffer | Blob,
  options: BlobUploadOptions = {},
  timeoutMs: number = 8000
): Promise<UploadResult> {
  const token = options.token || process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  const targetPath = options.folder ? `${options.folder}/${filename}` : filename;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const uploadPromise = (async () => {
      try {
        // Try public store mode first
        return await put(targetPath, content, {
          access: "public",
          token,
          addRandomSuffix: true,
        });
      } catch (err: any) {
        if (err.message && err.message.includes("private store")) {
          // Fallback for private store configuration
          return await put(targetPath, content, {
            token,
            addRandomSuffix: true,
          } as any);
        }
        throw err;
      }
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => {
        const timeoutError: any = new Error("External service did not respond within the configured timeout.");
        timeoutError.code = "UPSTREAM_TIMEOUT";
        reject(timeoutError);
      });
    });

    const blob = await Promise.race([uploadPromise, timeoutPromise]);
    clearTimeout(timeoutId);

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.code === "UPSTREAM_TIMEOUT" || controller.signal.aborted) {
      const error: any = new Error("External service did not respond within the configured timeout.");
      error.code = "UPSTREAM_TIMEOUT";
      throw error;
    }
    throw err;
  }
}

/**
 * Deletes a file from Vercel Blob storage with explicit timeout.
 */
export async function deleteFromBlob(
  url: string,
  token?: string,
  timeoutMs: number = 5000
): Promise<boolean> {
  const authToken = token || process.env.BLOB_READ_WRITE_TOKEN;
  if (!authToken) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const delPromise = del(url, { token: authToken });
    const timeoutPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => {
        reject(new Error("UPSTREAM_TIMEOUT"));
      });
    });

    await Promise.race([delPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    return true;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("Failed to delete blob or timed out:", err);
    return false;
  }
}

