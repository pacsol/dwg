#!/bin/bash
set -e

echo "=== Installing ODA File Converter ==="
apt-get update
apt-get install -y wget unzip

# Download ODA File Converter
wget -q "https://download.opendesign.com/guestfiles/Demo/ODAFileConverter_QT6_lnxX64_25.11dll_3.4.0.zip" -O /tmp/oda.zip

# Extract
mkdir -p /opt/oda
unzip -q /tmp/oda.zip -d /opt/oda
chmod +x /opt/oda/ODAFileConverter
rm /tmp/oda.zip

echo "=== ODA File Converter installed at /opt/oda/ODAFileConverter ==="
ls -la /opt/oda/

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Build complete ==="
