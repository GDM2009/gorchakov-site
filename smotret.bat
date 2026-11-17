@echo off
rem Посмотреть сайт на своём компьютере (Windows). Нужен Node.js 18 или новее: https://nodejs.org
rem Собирает сайт в папку dev и открывает его в браузере. Чтобы остановить, закройте это окно.
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Не найден Node.js. Установите его с https://nodejs.org и запустите файл снова. & pause & exit /b 1)
node tools\build.js || (pause & exit /b 1)
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8080/"
node tools\serve.js dev 8080
