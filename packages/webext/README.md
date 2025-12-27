# polysearch-webext

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://www.contributor-covenant.org/version/2/1/code_of_conduct)

> Browser extension for unified web search across multiple search engines

## Features

- 🌐 **Multi-Engine Search**: Search across Google CSE, DuckDuckGo, NPM Registry, and custom HTTP servers simultaneously
- 🔄 **Smart Result Merging**: Automatic deduplication and source tracking across engines
- ⚖️ **Weighted Ranking**: Configure engine priorities for customized result ordering
- 📝 **Real-time Suggestions**: Autocomplete suggestions as you type
- 🎨 **Modern UI**: Built with Nuxt UI and Vue 3 Composition API
- 🔧 **Flexible Configuration**: Customizable driver weights, timeouts, and caching options
- 🚀 **High Performance**: Parallel search execution with configurable timeouts
- 💾 **Built-in Caching**: Optional LRU cache support for improved performance
- 🌐 **Cross-Platform**: Support for Chromium-based browsers and Firefox

## Installation

### Development Setup

```bash
# Clone the repository
git clone https://github.com/DemoMacro/polysearch.git
cd polysearch/packages/webext

# Install dependencies
pnpm install
```

### Load Extension in Browser

#### Chromium-based Browsers (Chrome, Edge, Brave, etc.)

1. Run `pnpm build` to build the extension
2. Open the browser and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the `packages/webext/extension` directory

#### Firefox

1. Run `pnpm build` to build the extension
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file in `packages/webext/extension` directory

## Quick Start

1. Click the extension icon in your browser toolbar to open the side panel
2. Type your search query in the search box
3. View results from multiple search engines merged together
4. Each result shows which engines returned it (in the sources field)

As you type, the extension will provide search suggestions from the configured search engines. Your current input appears first, with additional suggestions below.

## Development

### Build

```bash
# Development mode (with hot reload)
pnpm dev

# Production build
pnpm build

# Pre-pack build (automatically runs before publish)
pnpm prepack
```

### Testing

```bash
# Load extension in Chromium
pnpm build
# Then manually load from chrome://extensions/

# Load extension in Firefox
pnpm build
# Then manually load from about:debugging

# Run linting
pnpm lint

# Type checking
pnpm build # Build includes type checking
```

## License

- [MIT](../../LICENSE) &copy; [Demo Macro](https://imst.xyz/)
