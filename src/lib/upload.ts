import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

export async function pickImage(fromCamera = false) {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: true };
  if (fromCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets[0]) return null;
  return res.assets[0].uri;
}

// Re-encodes the photo as a JPEG, which drops EXIF metadata including GPS (SEC-U4).
async function cleanJpeg(uri: string, maxWidth: number) {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: maxWidth });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

// Uploads to <bucket>/<user id>/<random>.jpg and returns the storage path.
export async function uploadPhoto(bucket: 'avatars' | 'gym-proofs', userId: string, uri: string) {
  const clean = await cleanJpeg(uri, bucket === 'avatars' ? 800 : 1600);
  const body = await (await fetch(clean)).arrayBuffer();
  const path = `${userId}/${Crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}
