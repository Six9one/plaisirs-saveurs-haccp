@echo off
REM Lance lapp HACCP en plein ecran avec impression automatique (sans fenetre dimpression).
REM Limprimante utilisee = imprimante PAR DEFAUT de Windows.
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
start "" %CHROME% --kiosk --kiosk-printing --user-data-dir="%LOCALAPPDATA%\HACCP-Kiosk" https://plaisirs-saveurs-haccp.vercel.app/
