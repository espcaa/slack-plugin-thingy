#!/bin/bash

# this script just downloads the go binary and runs it...
# source code at https://github.com/espcaa/slack-desktop-experiments


SERVER_URL=""

# detect arch + os

ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
BINARY_NAME="installer-bin-${OS}-${ARCH}"

echo "downloading installer binary for ${OS}/${ARCH}..."
curl -sSl "${SERVER_URL}/${BINARY_NAME}" -o /tmp/install-bin
chmod +x /tmp/install-bin
SERVER_URL=$SERVER_URL /tmp/install-bin
