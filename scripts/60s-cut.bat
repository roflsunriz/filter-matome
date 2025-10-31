cd %~dp0
for %%a in (%*) do ffmpeg -i %%a -t 60 "60s_%%~nxa"
rem ffmpeg -i %1 -c:v libx264 -b:v 600k -c:a aac -b:a 128k %~n1.mp4
pause