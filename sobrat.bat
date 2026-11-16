@echo off
rem Сборка сайта под новый адрес (Windows). Нужен Node.js 18 или новее.
rem   sobrat.bat https://example.ru            - сайт в корне домена
rem   sobrat.bat https://example.ru /expert    - сайт в подпапке /expert
if "%~1"=="" (echo Укажите адрес сайта, например: sobrat.bat https://example.ru & exit /b 1)
cd /d "%~dp0"
node tools\build.js %1 %2
