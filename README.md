# Desktop Assistant

A cross-platform desktop assistant application with AI-powered features for image processing, text editing, and workflow automation.

## Features

- **AI Image Processing**: Advanced image manipulation including background removal, image generation, and image expansion
- **Smart Text Processing**: Grammar correction, text generation, and content expansion
- **Cross-platform Support**: Works on Windows, macOS, and Linux
- **Modern Web UI**: React-based frontend with responsive design
- **Native Performance**: C++ backend for optimal performance
- **Clipboard Integration**: Seamless integration with system clipboard
- **Workflow Automation**: Streamlined editing workflows for productivity

## Architecture

This application consists of two main components:

### Native Backend (`/native`)
- **Language**: C++17
- **Platforms**: Windows, macOS, Linux
- **Build System**: CMake
- **Key Components**:
  - Window management and UI hosting
  - System integration (clipboard, shortcuts)
  - Message handling between native and web layers
  - Application context and preferences

### Frontend (`/frontend`)
- **Framework**: React 18
- **Language**: JavaScript/JSX
- **Build Tool**: Webpack 5
- **Styling**: SCSS with CSS Modules
- **Key Components**:
  - AI-powered image and text processing components
  - Modern carousel and preview interfaces
  - Responsive assistant interface
  - Real-time communication with native backend

## Getting Started

### Prerequisites

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **CMake** >= 3.16
- **C++17 compatible compiler**
  - Windows: Visual Studio 2019 or later
  - macOS: Xcode 12 or later
  - Linux: GCC 9+ or Clang 10+

### Platform-specific Dependencies

**macOS:**
```bash
# No additional dependencies required
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install build-essential cmake
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.0-dev
```

**Windows:**
```bash
# Install Visual Studio with C++ support
# CMake and Git should be in PATH
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/desktop-assistant.git
   cd desktop-assistant
   ```

2. **Install JavaScript dependencies**
   ```bash
   npm install
   ```

3. **Build the frontend**
   ```bash
   npm run build
   ```

4. **Configure and build the native backend**
   ```bash
   npm run cmake:configure
   npm run cmake:build
   ```

5. **Build everything**
   ```bash
   npm run build:all
   ```

## Development

### Frontend Development

Start the development server with hot reloading:
```bash
npm start
# or
npm run dev
```

### Native Development

Configure and build the C++ backend:
```bash
npm run cmake:configure
npm run cmake:build
```

For debugging, you can build in debug mode:
```bash
cmake -B build -S . -DCMAKE_BUILD_TYPE=Debug
cmake --build build
```

### Code Quality

Run linting and formatting:
```bash
npm run lint
npm run lint:fix
npm run format
```

Run tests:
```bash
npm test
npm run test:coverage
```

## Project Structure

```
├── native/                 # C++ native code
│   ├── include/            # Header files
│   │   ├── xplat/         # Cross-platform headers
│   │   └── mac/           # macOS-specific headers
│   ├── source/            # Implementation files
│   │   ├── xplat/         # Cross-platform code
│   │   ├── mac/           # macOS-specific code
│   │   └── win/           # Windows-specific code
│   └── resource/          # Platform resources
├── frontend/              # React frontend
│   ├── components/        # React components
│   ├── stores/           # State management
│   ├── styles/           # SCSS stylesheets
│   └── utils/            # Utility functions
├── CMakeLists.txt        # CMake configuration
├── webpack.config.js     # Webpack configuration
├── package.json          # Node.js dependencies
└── README.md            # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and formatting
- Write clear commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all platforms build successfully

## Building for Production

### Frontend
```bash
NODE_ENV=production npm run build
```

### Native (Release build)
```bash
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

### Complete build
```bash
npm run build:all
```

## Platform-specific Notes

### macOS
- The application builds as a `.app` bundle
- Requires macOS 10.14 or later
- Code signing may be required for distribution

### Windows
- Builds as a Windows executable
- Requires Windows 10 or later
- May require Visual C++ Redistributable

### Linux
- Requires GTK3 and WebKit2GTK
- Tested on Ubuntu 20.04+ and similar distributions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with modern C++ and React
- Uses CMake for cross-platform native builds
- Webpack for efficient frontend bundling
- Thanks to all contributors who make this project possible

## Support

For support, please open an issue on GitHub or contact the maintainers.

---

**Note**: This is an open-source project focused on providing a modern, cross-platform desktop assistant experience. The codebase has been restructured and cleaned for open-source distribution.
