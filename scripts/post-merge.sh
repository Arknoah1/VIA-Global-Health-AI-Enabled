#!/bin/bash
set -e

npm install

echo "yes" | npm run db:push
