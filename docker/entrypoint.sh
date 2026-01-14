#!/bin/sh
PORT=3000 node /app/server.js &
nginx -g 'daemon off;'
