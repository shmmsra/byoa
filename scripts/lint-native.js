#!/usr/bin/env node

const { execSync } = require('child_process');
const { globSync } = require('glob');
const path = require('path');

const args = process.argv.slice(2);
const fix = args.includes('--fix');

// Find all C++ files in src/native
const patterns = ['src/native/**/*.cpp', 'src/native/**/*.hpp', 'src/native/**/*.mm'];
const files = patterns.flatMap(pattern => globSync(pattern, { windowsPathsNoEscape: true }));

if (files.length === 0) {
  console.log('No C++ files found to lint');
  process.exit(0);
}

console.log(`Found ${files.length} files to check`);

// Run clang-format on each file
const clangFormatArgs = fix ? ['-i'] : ['--dry-run', '--Werror'];

try {
  for (const file of files) {
    const normalizedPath = path.normalize(file);
    console.log(`Checking ${normalizedPath}...`);
    execSync(`clang-format ${clangFormatArgs.join(' ')} "${normalizedPath}"`, {
      stdio: 'inherit'
    });
  }
  console.log('✓ All files passed clang-format check');
} catch (error) {
  console.error('✗ clang-format check failed');
  process.exit(1);
}

