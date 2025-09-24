cd %~dp0
for %%a in (%*) do ffmpeg -i %%a -t 10 "10s_%%~nxa"
pause