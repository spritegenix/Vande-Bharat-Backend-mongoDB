import { customAlphabet } from 'nanoid';
import { UserModel } from '@/models/user.model';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 5);

/**
 * Generate a unique, URL-friendly slug based on user's full name
 * @param fullName Full name of the user (e.g., "John Doe")
 * @returns Unique slug (e.g., "john-doe", "john-doe-x4k3z")
 */
export async function generateSlug(text: string): Promise<string> {
  const baseSlug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')   
    .replace(/^-+|-+$/g, ''); 

  let slug = baseSlug;
  let attempt = 0;

  // Try max 5 attempts with unique nanoid
  while (await UserModel.exists({ slug })) {
    attempt++;
    slug = `${baseSlug}-${nanoid()}`;
    if (attempt >= 5) break;
  }

  return slug;
}