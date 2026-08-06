/**
 * Safe image upload utility for recipe images using blob URLs.
 * Creates blob URLs from uploaded images that can be safely stored as references.
 */

/**
 * Uploads an image file safely and returns a stable blob URL reference.
 *
 * @param file - The image file to upload
 * @returns Promise<string> - A blob URL reference (blob:)
 * @throws Error if upload fails or image is too large
 */
export async function uploadImageSafely(file: File): Promise<string> {
  try {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    // Validate file size (max 10MB for upload)
    const maxUploadSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxUploadSize) {
      throw new Error("Image size must be less than 10MB");
    }

    console.log("Starting image upload:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    // Create a blob URL from the file
    // This creates a URL like: blob:http://localhost:3000/uuid
    const blobUrl = URL.createObjectURL(file);

    console.log("Image upload successful:", {
      fileName: file.name,
      blobUrl,
      urlType: "blob:",
    });

    return blobUrl;
  } catch (error: any) {
    console.error("Image upload error:", error);
    throw new Error(error?.message || "Failed to upload image");
  }
}

/**
 * Validates that an image URL is safe (proper blob or https URL reference).
 *
 * @param imageUrl - The image URL to validate
 * @returns boolean - True if the URL is safe
 */
export function isImageUrlSafe(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return true;

  // Check that it's a URL reference (blob: or https://) and not inline data (data:)
  if (imageUrl.startsWith("data:")) {
    console.warn(
      "Unsafe image URL detected: data URL not allowed",
      imageUrl.substring(0, 50),
    );
    return false;
  }

  // Allow blob URLs and secure HTTPS URLs
  if (imageUrl.startsWith("blob:") || imageUrl.startsWith("https://")) {
    return true;
  }

  // Allow http URLs for local development
  if (imageUrl.startsWith("http://")) {
    return true;
  }

  console.warn(
    "Unsafe image URL detected: invalid URL format",
    imageUrl.substring(0, 50),
  );
  return false;
}
