import React from 'react';
import * as Diff from 'diff';
import { calculateStringSimilarity } from '../utils/similarity';

interface DiffViewerProps {
    original: string;
    result: string;
    threshold?: number; // Similarity threshold (0-1), default 0.7
    className?: string;
    showDiff?: boolean; // Force show diff regardless of similarity
}

interface SimilarityResult {
    similarity: number;
    isSimilar: boolean;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * @deprecated Use calculateStringSimilarity from utils/similarity instead
 */
export const calculateSimilarity = (str1: string, str2: string): SimilarityResult => {
    const result = calculateStringSimilarity(str1, str2);
    return {
        similarity: result.similarity,
        isSimilar: result.isSimilar,
    };
};

/**
 * Generate diff chunks between two strings
 */
const generateDiffChunks = (original: string, result: string) => {
    return Diff.diffWords(original, result, {
        ignoreWhitespace: false,
        newlineIsToken: true,
    });
};

/**
 * Render a single diff chunk
 */
const DiffChunk: React.FC<{ chunk: Diff.Change }> = ({ chunk }) => {
    if (chunk.added) {
        return <span className='diff-added'>{chunk.value}</span>;
    }

    if (chunk.removed) {
        return <span className='diff-removed'>{chunk.value}</span>;
    }

    return <span className='diff-unchanged'>{chunk.value}</span>;
};

/**
 * DiffViewer component that shows differences between original and result text
 */
export const DiffViewer: React.FC<DiffViewerProps> = ({
    original,
    result,
    threshold = 0.7,
    className = '',
    showDiff = undefined,
}) => {
    const similarityResult = calculateStringSimilarity(original, result);
    const shouldShowDiff =
        showDiff !== undefined
            ? showDiff
            : similarityResult.isSimilar && similarityResult.similarity >= threshold;

    if (!shouldShowDiff) {
        // If not similar enough, show result as-is
        return (
            <div className={`diff-viewer ${className}`}>
                <div className='diff-content'>{result}</div>
            </div>
        );
    }

    // Generate diff chunks
    const diffChunks = generateDiffChunks(original, result);

    return (
        <div className={`diff-viewer ${className}`}>
            <div className='diff-content'>
                {diffChunks.map((chunk, index) => (
                    <DiffChunk key={index} chunk={chunk} />
                ))}
            </div>
        </div>
    );
};

/**
 * Hook to determine if content should be shown as diff
 */
export const useDiffDisplay = (original: string, result: string, threshold = 0.7) => {
    const similarityResult = calculateStringSimilarity(original, result);
    const shouldShowDiff = similarityResult.isSimilar && similarityResult.similarity >= threshold;

    return {
        shouldShowDiff,
        similarity: similarityResult.similarity,
        isSimilar: similarityResult.isSimilar,
        distance: similarityResult.distance,
    };
};
