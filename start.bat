@echo off
REM ZGoogies Application Starter for Windows
REM Starts both frontend and backend servers

echo ==================================================
echo Starting ZGoogies Application
echo ==================================================

REM Use the venv Python to run the start script
"%~dp0backend\venv\Scripts\python.exe" "%~dp0start.py"

pause
