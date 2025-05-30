export const buildSearchQuery = (search?: string): Record<string, any> => {
  if (!search) return {};

  // Normalize + to space for URL-encoded values
  let searchText = decodeURIComponent(search.replace(/\+/g, ' ').trim());

  // If wrapped in quotes => MongoDB full-text phrase search
  if (searchText.includes('"')) {
    return { $text: { $search: searchText } };
  }

  // Tag-only search: starts with '#' and no '+' in original input
  if (searchText.startsWith('#') && !search.includes('+')) {
    const tag = searchText.slice(1).toLowerCase();
    return { tags: tag };
  }

  // Escape regex to prevent malformed input or injection
  const escapedText = searchText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

  return {
    $or: [
      { title: { $regex: new RegExp(escapedText, 'i') } },
    ],
  };
};
