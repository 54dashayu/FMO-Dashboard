@echo off
setlocal
cd /d "%~dp0"

set "PID_FILE=%~dp0fmo-dashboard.pid"

if not exist "%PID_FILE%" goto not_running

set /p APP_PID=<"%PID_FILE%"
if "%APP_PID%"=="" goto not_running

taskkill /PID %APP_PID% /T /F >nul 2>nul
del "%PID_FILE%" >nul 2>nul
echo FMO Dashboard has been stopped.
pause
exit /b 0

:not_running
echo FMO Dashboard is not running, or it was started from another folder.
pause
exit /b 0
