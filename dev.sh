#!/bin/bash

# Check and kill processes on port 8080
echo "Checking for processes on port 8080..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Start Python backend
echo "Starting Python backend..."
python main.py &

# Wait a moment for the backend to start
sleep 2

# Start Next.js frontend
echo "Starting Next.js frontend..."
cd frontend && npm run dev &

# Wait for both processes
wait 