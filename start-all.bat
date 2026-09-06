@echo off
title AgriFlow — Starting All Services

echo ==========================================
echo    AgriFlow - Starting All Services
echo ==========================================
echo.

:: Start MongoDB in a new window
echo [1/4] Starting MongoDB...
start "AgriFlow - MongoDB" cmd /k "cd %USERPROFILE%\Downloads\mongodb-windows-x86_64-8.3.4\mongodb-win32-x86_64-windows-8.3.4\bin && mongod.exe --dbpath C:\Users\mohit\OneDrive\Desktop\PROJECTS\IM_project\agriflow\database_data"
timeout /t 3 /nobreak > nul

:: Start Node.js backend in a new window
echo [2/4] Starting Node.js backend (port 5000)...
start "AgriFlow - Backend" cmd /k "cd C:\Users\mohit\OneDrive\Desktop\PROJECTS\IM_project\agriflow\server && npm run dev"
timeout /t 2 /nobreak > nul

:: Start Python ML service in a new window
echo [3/4] Starting Python ML service (port 8000)...
start "AgriFlow - ML Service" cmd /k "cd C:\Users\mohit\OneDrive\Desktop\PROJECTS\IM_project\agriflow\ml-service && python main.py"
timeout /t 2 /nobreak > nul

:: Start React frontend in a new window
echo [4/4] Starting React frontend (port 5173)...
start "AgriFlow - Frontend" cmd /k "cd C:\Users\mohit\OneDrive\Desktop\PROJECTS\IM_project\agriflow\client && npm run dev"

echo.
echo ==========================================
echo  All services starting in separate windows
echo ==========================================
echo.
echo  Frontend:   http://localhost:5173
echo  Backend:    http://localhost:5000/api/health
echo  ML Service: http://localhost:8000/health
echo.
echo  Close those windows to stop each service.
echo.
pause
