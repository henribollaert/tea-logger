#!/bin/bash
# Script to start both frontend and backend processes

echo "Starting Tea Logger App..."

# Start the backend process in the background
cd tea-logger-backend
source venv/bin/activate
python app.py &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

# Start the frontend process in the background
cd ../tea-logger-frontend
npm start &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

echo "Tea Logger app is running!"
echo "Press Ctrl+C to stop both processes"

# Function to kill processes when script is terminated
function cleanup {
  echo "Stopping Tea Logger App..."
  kill $BACKEND_PID
  kill $FRONTEND_PID
  echo "App stopped successfully"
  exit
}

# Register the cleanup function to run when script receives SIGINT (Ctrl+C)
trap cleanup SIGINT

# Keep the script running
wait