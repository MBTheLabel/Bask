#!/bin/bash
cd client && npm install && npm run build && cd ..
npx tsc --skipLibCheck --noEmitOnError false || true
