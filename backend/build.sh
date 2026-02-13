#!/bin/bash
set -e

echo "=== Installing ODA File Converter (without apt-get) ==="

# Download ODA File Converter directly
wget -q "https://download.opendesign.com/guestfiles/Demo/ODAFileConverter_QT6_lnxX64_25.11dll_3.4.0.zip" -O /tmp/oda.zip

# Extract to /tmp since /opt may also be read-only
mkdir -p /tmp/oda
unzip -q /tmp/oda.zip -d /tmp/oda
chmod +x /tmp/oda/ODAFileConverter
rm /tmp/oda.zip

echo "=== ODA File Converter installed at /tmp/oda/ODAFileConverter ==="
ls -la /tmp/oda/

# Update environment variable path
export ODA_CONVERTER_PATH=/tmp/oda/ODAFileConverter

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Build complete ==="
