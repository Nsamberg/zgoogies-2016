@echo off
REM ZGoogies Application Stopper for Windows
REM Stops both frontend and backend servers

echo ==================================================
echo Stopping ZGoogies Application
echo ==================================================

REM Use the venv Python to run the stop script
"%~dp0backend\venv\Scripts\python.exe" "%~dp0stop.py"

pause
