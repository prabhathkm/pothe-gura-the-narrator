#!/usr/bin/env bash
APP_KEY=pothe-gura

# stop prev app
pm2 stop $APP_KEY

# run npm install
npm install

#start new build
pm2 start ./index.js --name $APP_KEY --merge-logs -i 1