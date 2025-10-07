// Example usage of the diff functionality
// This file demonstrates how the DiffViewer component works

import { calculateStringSimilarity, shouldShowDiff } from './utils/similarity';

// Example 1: Similar strings (should show diff)
const original1 = 'Hello world!';
const result1 = 'Hallo world!';
const similarity1 = calculateStringSimilarity(original1, result1);
console.log('Example 1:');
console.log(`Original: "${original1}"`);
console.log(`Result: "${result1}"`);
console.log(`Similarity: ${(similarity1.similarity * 100).toFixed(1)}%`);
console.log(`Should show diff: ${shouldShowDiff(original1, result1)}`);
console.log('---');

// Example 2: Very different strings (should show as-is)
const original2 = 'Hello world!';
const result2 = 'This is a completely different sentence with no similarity.';
const similarity2 = calculateStringSimilarity(original2, result2);
console.log('Example 2:');
console.log(`Original: "${original2}"`);
console.log(`Result: "${result2}"`);
console.log(`Similarity: ${(similarity2.similarity * 100).toFixed(1)}%`);
console.log(`Should show diff: ${shouldShowDiff(original2, result2)}`);
console.log('---');

// Example 3: Code modification (should show diff)
const original3 = `function add(a, b) {
  return a + b;
}`;
const result3 = `function add(a, b) {
  return a + b + 1;
}`;
const similarity3 = calculateStringSimilarity(original3, result3);
console.log('Example 3:');
console.log(`Original: "${original3}"`);
console.log(`Result: "${result3}"`);
console.log(`Similarity: ${(similarity3.similarity * 100).toFixed(1)}%`);
console.log(`Should show diff: ${shouldShowDiff(original3, result3)}`);
console.log('---');

// Example 4: Threshold testing
const original4 = 'The quick brown fox';
const result4 = 'The quick brown dog';
const similarity4 = calculateStringSimilarity(original4, result4);
console.log('Example 4:');
console.log(`Original: "${original4}"`);
console.log(`Result: "${result4}"`);
console.log(`Similarity: ${(similarity4.similarity * 100).toFixed(1)}%`);
console.log(`Should show diff (threshold 0.7): ${shouldShowDiff(original4, result4, 0.7)}`);
console.log(`Should show diff (threshold 0.8): ${shouldShowDiff(original4, result4, 0.8)}`);
console.log(`Should show diff (threshold 0.6): ${shouldShowDiff(original4, result4, 0.6)}`);
