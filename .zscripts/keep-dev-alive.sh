#!/bin/bash
cd /home/z/my-project
if pgrep -f "next dev -p 3000" >/dev/null 2>&1; then
  exit 0
fi
echo "[$(date '+%H:%M:%S')] dev not running, restarting..." >> /home/z/my-project/dev.log
nohup /home/z/my-project/node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 &
disown
exit 0
