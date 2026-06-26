import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const IMGBB_API_KEY = process.env.EXPO_PUBLIC_IMGBB_API_KEY || 'cc2b40a8d4b4ea9112cc1e94d42d40ea';

/**
 * Request permissions and let the user select one or more images from their library.
 */
export async function pickImages(allowMultiple = true): Promise<string[]> {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permissionResult.granted) {
    throw new Error('Permission to access camera roll is required.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: allowMultiple,
    quality: 1, // Get original, we will compress it ourselves
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map(asset => asset.uri);
}

/**
 * Request camera permissions and take a photo using the device camera.
 */
export async function takePhoto(): Promise<string | null> {
  const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

  if (!permissionResult.granted) {
    throw new Error('Permission to access camera is required.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1, // Get original, we will compress it ourselves
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
}

/**
 * Compresses an image: resizes it to a maximum width of 1000px and sets compression quality to 0.75.
 */
export async function compressImage(uri: string): Promise<string> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1000 } }], // Resize width to 1000px, height will scale proportionally
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.error('Failed to compress image:', error);
    return uri; // Return original if compression fails
  }
}

/**
 * Uploads a compressed image to ImgBB and returns the hosted URL.
 */
export async function uploadToImgBB(uri: string): Promise<string> {
  const filename = uri.split('/').pop() || 'upload.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  const formData = new FormData();
  // React Native requires a special object structure for file uploads in FormData
  formData.append('image', {
    uri,
    name: filename,
    type,
  } as any);

  const uploadUrl = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ImgBB upload failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  if (result.success && result.data && result.data.url) {
    return result.data.url;
  } else {
    throw new Error('ImgBB did not return a valid URL.');
  }
}

export const uploadImageToImgbb = uploadToImgBB;
