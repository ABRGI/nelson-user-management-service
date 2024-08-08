#!/bin/bash

# Script kills the server process if it is running
# If the process is not being killed when running this script, try running using sudo. lsof sometimes doesnt return port if not run as sudo

PORT=4005
LOG_FILE="logs/logs.log"

PID=$(lsof -t -i :$PORT)

if [ -z "$PID" ]; then
  echo "No process is running on port $PORT." >> $LOG_FILE
else
  kill -9 $PID
  echo "Process on port $PORT (PID: $PID) has been terminated." >> $LOG_FILE
fi