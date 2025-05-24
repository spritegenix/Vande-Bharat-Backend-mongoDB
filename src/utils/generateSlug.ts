import { customAlphabet } from 'nanoid';
import { Model } from 'mongoose';
import { UserModel } from '@/models/user.model';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 5);

/**
 * Generate a unique, URL-friendly slug based on user's full name
 * @param fullName Full name of the user (e.g., "John Doe")
 * @returns Unique slug (e.g., "john-doe", "john-doe-x4k3z")
 */
export async function generateSlug( text: string, model: Model<any> = UserModel ): Promise<string> {
  const baseSlug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')   
    .replace(/^-+|-+$/g, ''); 

  let slug = baseSlug;
  let attempt = 0;

  // Try max 5 attempts with unique nanoid
 while (await model.exists({ slug })) {
    attempt++;
    slug = `${baseSlug}-${nanoid(6)}`; // short id for readability
    if (attempt >= 5) break;
  }

  return slug;
}
/*
// Default: UserModel
const slug1 = await generateSlug('Jane Doe');

// Custom model: Community
const slug2 = await generateSlug('Dev Talk', Community);

// Custom model: Page
const slug3 = await generateSlug('Marketing Hub', PageModel);
 */