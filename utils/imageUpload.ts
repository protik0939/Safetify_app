import * as ImageManipulator from 'expo-image-manipulator';

export async function uploadImageToImgbb(uri: string): Promise<string | null> {
  try {
    // Resize to 500x500, compress slightly, save as WEBP
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 500, height: 500 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.WEBP, base64: true }
    );

    if (!manipResult.base64) {
      throw new Error("Base64 string not generated");
    }

    const IMGBB_API_KEY = process.env.EXPO_PUBLIC_IMGBB_API_KEY;
    if (!IMGBB_API_KEY) {
      console.error("Missing EXPO_PUBLIC_IMGBB_API_KEY");
      return null;
    }

    const formData = new FormData();
    formData.append('image', manipResult.base64);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      return data.data.url;
    } else {
      console.error("ImgBB upload error:", data);
      return null;
    }
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
}
