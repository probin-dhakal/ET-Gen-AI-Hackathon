import axios from "axios";

// Pexels API Configuration
const PEXELS_API_KEY =
  import.meta.env.VITE_PEXELS_API_KEY || "YOUR_PEXELS_API_KEY_HERE";
const PEXELS_BASE_URL = "https://api.pexels.com/v1/search";

// Cache to avoid duplicate API calls for same keyword
const imageCache = new Map();

/**
 * Fetch image URL from Pexels API based on keyword/query
 * @param {string} query - Search query (article title or keyword)
 * @returns {Promise<string>} - Image URL or placeholder if not found
 */
export const fetchImageFromPexels = async (query) => {
  try {
    // Sanitize query - take first meaningful words
    const cleanQuery = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "") // Remove special characters
      .split(" ")
      .filter((word) => word.length > 2) // Filter out small words
      .slice(0, 3) // Take first 3 words
      .join(" ")
      .trim();

    // Return cached image if available
    if (imageCache.has(cleanQuery)) {
      return imageCache.get(cleanQuery);
    }

    if (!PEXELS_API_KEY || PEXELS_API_KEY === "YOUR_PEXELS_API_KEY_HERE") {
      console.warn("Pexels API key not configured. Using placeholder images.");
      return getPlaceholderImage(query);
    }

    const response = await axios.get(PEXELS_BASE_URL, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
      params: {
        query: cleanQuery || "news",
        per_page: 1,
        page: 1,
      },
      timeout: 5000, // 5 second timeout
    });

    if (response.data?.photos && response.data.photos.length > 0) {
      const imageUrl = response.data.photos[0].src.medium; // medium size ~500x375px
      imageCache.set(cleanQuery, imageUrl); // Cache the result
      console.log(`✓ Fetched image for query: "${cleanQuery}" from Pexels`);
      return imageUrl;
    }

    console.warn(`No images found for query: "${cleanQuery}"`);
    return getPlaceholderImage(query);
  } catch (error) {
    console.error(`Error fetching image for "${query}":`, error.message);
    return getPlaceholderImage(query);
  }
};

/**
 * Get placeholder image URL with text
 * @param {string} text - Text to display on placeholder
 * @returns {string} - Placeholder image URL
 */
export const getPlaceholderImage = (text = "News") => {
  const encodedText = encodeURIComponent(text.substring(0, 20));
  return `https://picsum.photos/400/300?text=${encodedText}&random=${Math.random()}`;
};

/**
 * Batch fetch images for multiple keywords
 * Useful for fetching images for multiple articles at once
 * @param {string[]} keywords - Array of keywords
 * @returns {Promise<Object>} - Object mapping keywords to image URLs
 */
export const fetchImagesBatch = async (keywords) => {
  const images = {};

  for (const keyword of keywords) {
    images[keyword] = await fetchImageFromPexels(keyword);
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return images;
};

/**
 * Clear image cache (useful for refresh)
 */
export const clearImageCache = () => {
  imageCache.clear();
};

export default {
  fetchImageFromPexels,
  getPlaceholderImage,
  fetchImagesBatch,
  clearImageCache,
};
