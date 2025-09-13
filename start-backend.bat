@echo off
echo Starting NanoInfluencer Backend Development Server...
cd /d "%~dp0backend"
set NODE_ENV=development
npm run dev