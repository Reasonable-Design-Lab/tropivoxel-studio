@echo off
setlocal
title TropiVoxel Studio
cd /d "%~dp0"
set "STUDIO_NODE="
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "STUDIO_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined STUDIO_NODE for /f "delims=" %%N in ('where node 2^>nul') do if not defined STUDIO_NODE set "STUDIO_NODE=%%N"
if not defined STUDIO_NODE (
  echo Node.js was not found. Please install Node.js 22 LTS.
  if not "%~1"=="--check" pause
  exit /b 1
)
"%STUDIO_NODE%" "%~dp0tropivoxel-sg\scripts\launch.mjs" %*
set "STUDIO_EXIT=%ERRORLEVEL%"
if "%~1"=="--check" exit /b %STUDIO_EXIT%
if not "%STUDIO_EXIT%"=="0" (
  echo.
  echo Startup failed. See artifacts\startup.log for details.
  pause
)
exit /b %STUDIO_EXIT%
