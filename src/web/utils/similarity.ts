import * as levenshtein from 'fast-levenshtein';

/**
 * Calculate similarity between two strings using Levenshtein distance
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns Object containing similarity score (0-1) and whether strings are similar (>0.7)
 */
export const calculateStringSimilarity = (
    str1: string,
    str2: string
): {
    similarity: number;
    isSimilar: boolean;
    distance: number;
} => {
    const distance = levenshtein.get(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    const similarity = maxLen === 0 ? 1 : (maxLen - distance) / maxLen;

    return {
        similarity,
        isSimilar: similarity > 0.7,
        distance,
    };
};

/**
 * Check if two strings are similar enough to show as diff
 * @param original Original string
 * @param result Result string
 * @param threshold Similarity threshold (default: 0.7)
 * @returns Whether to show diff view
 */
export const shouldShowDiff = (original: string, result: string, threshold = 0.7): boolean => {
    const { similarity } = calculateStringSimilarity(original, result);
    return similarity >= threshold;
};
