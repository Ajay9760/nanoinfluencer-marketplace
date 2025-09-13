@echo off
echo Starting NanoInfluencer Frontend Development Server...
cd /d "%~dp0frontend-web"
set REACT_APP_API_URL=http://localhost:3001/api
npm start