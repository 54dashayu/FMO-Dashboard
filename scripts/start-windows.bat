@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=%~dp0runtime\node.exe"
if exist "%NODE_EXE%" goto run

where node >nul 2>nul
if errorlevel 1 goto missing_node
set "NODE_EXE=node"

:run
"%NODE_EXE%" "%~dp0server.mjs"
pause
exit /b %errorlevel%

:missing_node
echo Node.js runtime was not found.
echo Please use the full portable package, or install Node.js first.
pause
exit /b 1
