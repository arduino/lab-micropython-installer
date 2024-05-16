#!/bin/bash

# This script can be used to check the validity of a codesigned app on macOS.
# It runs both codesign and Gatekeeper assessments.
# Example usage: ./check-validity-macos.sh ""./out/MicroPython Installer-darwin-x64/MicroPython Installer.app"
codesign --verify --deep --strict --verbose=2 "$1"
if [ $? -ne 0 ]; then
    echo "❌ Codesign verification failed. Exiting..."
    exit 1
else
    echo "✅ Codesign verification passed."
fi

spctl --assess --verbose=4 "$1"

# if spctl returned an error
if [ $? -ne 0 ]; then
    echo "❌ Gatekeeper assessment failed."
    echo "👀 Finding broken symlinks..."
    find "$1" -type l ! -exec test -e {} \; -print
else
    echo "✅ Gatekeeper assessment passed."
fi