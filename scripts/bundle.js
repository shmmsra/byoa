#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Determine platform
const platform = process.platform;
const isWindows = platform === 'win32';
const isMacOS = platform === 'darwin';

// Paths
const projectRoot = path.resolve(__dirname, '..');
const buildDir = path.join(projectRoot, 'build');
const distDir = path.join(projectRoot, 'dist');

console.log(`🔧 Platform detected: ${platform}`);
console.log(`📦 Build directory: ${buildDir}`);
console.log(`📂 Distribution directory: ${distDir}`);

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
    console.log('📁 Creating dist directory...');
    fs.mkdirSync(distDir, { recursive: true });
} else {
    console.log('🗑️  Cleaning existing dist directory...');
    fs.rmSync(distDir, { recursive: true, force: true });
    fs.mkdirSync(distDir, { recursive: true });
}

/**
 * Copy file or directory recursively
 */
function copyRecursive(src, dest) {
    const stat = fs.statSync(src);

    if (stat.isDirectory()) {
        // Create destination directory
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        // Copy all files and subdirectories
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
            const srcPath = path.join(src, entry);
            const destPath = path.join(dest, entry);
            copyRecursive(srcPath, destPath);
        }
    } else {
        // Copy file
        fs.copyFileSync(src, dest);
    }
}

/**
 * Bundle macOS application
 */
function bundleMacOS() {
    const appName = 'BYOAssistant.app';
    const appPath = path.join(buildDir, appName);
    const destPath = path.join(distDir, appName);

    if (!fs.existsSync(appPath)) {
        console.error(`❌ Error: macOS app bundle not found at ${appPath}`);
        console.error("   Make sure you've run: yarn build:native:release");
        process.exit(1);
    }

    console.log(`📦 Copying ${appName}...`);
    copyRecursive(appPath, destPath);

    console.log('✅ macOS bundle complete!');
    console.log(`   App: ${destPath}`);
}

/**
 * Bundle Windows application
 */
function bundleWindows() {
    const exeName = 'BYOAssistant.exe';
    const exePath = path.join(buildDir, exeName);
    const destExePath = path.join(distDir, exeName);

    if (!fs.existsSync(exePath)) {
        console.error(`❌ Error: Windows executable not found at ${exePath}`);
        console.error("   Make sure you've run: yarn build:native:release");
        process.exit(1);
    }

    console.log(`📦 Copying ${exeName}...`);
    fs.copyFileSync(exePath, destExePath);

    // Copy any DLL dependencies if they exist
    console.log('🔍 Looking for DLL dependencies...');
    const dllFiles = fs.readdirSync(buildDir).filter(file => file.endsWith('.dll'));

    if (dllFiles.length > 0) {
        console.log(`📦 Copying ${dllFiles.length} DLL file(s)...`);
        for (const dll of dllFiles) {
            const srcDll = path.join(buildDir, dll);
            const destDll = path.join(distDir, dll);
            fs.copyFileSync(srcDll, destDll);
            console.log(`   ✓ ${dll}`);
        }
    } else {
        console.log('   No DLL files found.');
    }

    console.log('✅ Windows bundle complete!');
    console.log(`   Executable: ${destExePath}`);
}

/**
 * Main bundling function
 */
function bundle() {
    console.log('\n🚀 Starting BYOA bundling process...\n');

    if (isMacOS) {
        bundleMacOS();
    } else if (isWindows) {
        bundleWindows();
    } else {
        console.error(`❌ Error: Unsupported platform: ${platform}`);
        console.error('   This script only supports macOS (darwin) and Windows (win32)');
        process.exit(1);
    }

    console.log(`\n✨ Bundling complete! Output in: ${distDir}\n`);
}

// Run the bundler
bundle();
