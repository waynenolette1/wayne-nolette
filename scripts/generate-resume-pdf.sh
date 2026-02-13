#!/bin/bash

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HTML_PATH="$SCRIPT_DIR/resume.html"
PDF_PATH="$SCRIPT_DIR/../public/wayne_nolette_resume.pdf"

# Detect Chrome path based on platform
detect_chrome() {
    local chrome_path=""

    case "$(uname -s)" in
        Darwin)
            # macOS paths
            if [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
                chrome_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            elif [ -x "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
                chrome_path="$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            elif [ -x "/Applications/Chromium.app/Contents/MacOS/Chromium" ]; then
                chrome_path="/Applications/Chromium.app/Contents/MacOS/Chromium"
            fi
            ;;
        Linux)
            # Linux paths - check common locations
            if command -v google-chrome &> /dev/null; then
                chrome_path="$(command -v google-chrome)"
            elif command -v google-chrome-stable &> /dev/null; then
                chrome_path="$(command -v google-chrome-stable)"
            elif command -v chromium &> /dev/null; then
                chrome_path="$(command -v chromium)"
            elif command -v chromium-browser &> /dev/null; then
                chrome_path="$(command -v chromium-browser)"
            elif [ -x "/usr/bin/google-chrome" ]; then
                chrome_path="/usr/bin/google-chrome"
            elif [ -x "/usr/bin/chromium" ]; then
                chrome_path="/usr/bin/chromium"
            elif [ -x "/snap/bin/chromium" ]; then
                chrome_path="/snap/bin/chromium"
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)
            echo "Error: Windows is not supported by this script." >&2
            echo "Please use Chrome manually:" >&2
            echo "  1. Open $HTML_PATH in Chrome" >&2
            echo "  2. Print to PDF (Ctrl+P -> Save as PDF)" >&2
            echo "  3. Save to $PDF_PATH" >&2
            exit 1
            ;;
        *)
            echo "Error: Unknown operating system: $(uname -s)" >&2
            exit 1
            ;;
    esac

    echo "$chrome_path"
}

# Validate input file exists
if [ ! -f "$HTML_PATH" ]; then
    echo "Error: Input HTML file not found: $HTML_PATH" >&2
    echo "Please ensure resume.html exists in the scripts directory." >&2
    exit 1
fi

# Detect Chrome
CHROME="$(detect_chrome)"

if [ -z "$CHROME" ]; then
    echo "Error: Google Chrome or Chromium not found." >&2
    echo "" >&2
    case "$(uname -s)" in
        Darwin)
            echo "Install Chrome from: https://www.google.com/chrome/" >&2
            echo "Or install Chromium via Homebrew: brew install --cask chromium" >&2
            ;;
        Linux)
            echo "Install Chrome or Chromium using your package manager:" >&2
            echo "  Ubuntu/Debian: sudo apt install chromium-browser" >&2
            echo "  Fedora: sudo dnf install chromium" >&2
            echo "  Arch: sudo pacman -S chromium" >&2
            echo "Or download from: https://www.google.com/chrome/" >&2
            ;;
    esac
    exit 1
fi

echo "Generating PDF resume..."
echo "Chrome: $CHROME"
echo "Input: $HTML_PATH"
echo "Output: $PDF_PATH"

# Ensure output directory exists
mkdir -p "$(dirname "$PDF_PATH")"

# Generate PDF
if ! "$CHROME" --headless --disable-gpu --print-to-pdf="$PDF_PATH" --no-pdf-header-footer "file://$HTML_PATH"; then
    echo "Error: Chrome PDF generation command failed" >&2
    exit 1
fi

if [ -f "$PDF_PATH" ]; then
    echo "PDF generated successfully!"
else
    echo "Error: PDF generation failed - output file not created" >&2
    exit 1
fi
