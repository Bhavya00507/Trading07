@echo off
set ADB=C:\Users\bhavy\AppData\Local\Android\Sdk\platform-tools\adb.exe
set ANDROID_ADB_SERVER_PORT=5038

echo === Killing old adb daemon on default port ===
%ADB% -P 5037 kill-server 2>nul
%ADB% -P 5038 kill-server 2>nul
timeout /t 2 /nobreak >nul

echo === Starting adb daemon on port 5038 ===
%ADB% -P 5038 start-server
timeout /t 3 /nobreak >nul

echo === Listing devices ===
%ADB% -P 5038 devices

echo === Uninstalling old APK ===
%ADB% -P 5038 uninstall com.trading.platform

echo === Installing new APK ===
%ADB% -P 5038 install -r "D:\Trading07\android\app\build\outputs\apk\debug\app-debug.apk"
echo Exit code: %ERRORLEVEL%

echo === Launching app ===
%ADB% -P 5038 shell am start -n com.trading.platform/.MainActivity
echo === Done ===
