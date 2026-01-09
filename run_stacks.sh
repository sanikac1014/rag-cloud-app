#!/usr/bin/env bash
set -euo pipefail

# Config (change if needed)
DB_URL="postgresql://flywl_user:Abhinav123@localhost:5432/flywl"
EXTERNAL_BACKEND_DIR="/D:/Downloads/Unique-id/Unique-id/react-fuid-system/backend"
EXTERNAL_FRONTEND_DIR="/D:/Downloads/Unique-id/Unique-id/react-fuid-system"


# Ports (make sure they don’t collide)
EXTERNAL_BACKEND_PORT="${EXTERNAL_BACKEND_PORT:-5002}"
EXTERNAL_FRONTEND_PORT="${EXTERNAL_FRONTEND_PORT:-3000}"


echo "Killing anything on chosen ports..."
lsof -ti :$EXTERNAL_BACKEND_PORT | xargs -r kill -9 || true
lsof -ti :$EXTERNAL_FRONTEND_PORT | xargs -r kill -9 || true

echo "Starting external backend..."
screen -S react-backend -dm bash -lc "cd \"$EXTERNAL_BACKEND_DIR\" && export DATABASE_URL=${DB_URL/\/\/flywl_user:/\/\/flywl_user:} && export PORT=$EXTERNAL_BACKEND_PORT && python server.py >> server.log 2>&1"

echo "Starting external frontend..."
screen -S react-frontend -dm bash -lc "cd \"$EXTERNAL_FRONTEND_DIR\" && export REACT_APP_API_URL=http://localhost:${EXTERNAL_BACKEND_PORT}/api && export PORT=$EXTERNAL_FRONTEND_PORT && npm install --silent && npm start >> ui.log 2>&1"


echo "Done. Sessions:"
screen -ls
echo "External UI:   http://localhost:${EXTERNAL_FRONTEND_PORT}"
echo "External API:  http://localhost:${EXTERNAL_BACKEND_PORT}/api/health"
