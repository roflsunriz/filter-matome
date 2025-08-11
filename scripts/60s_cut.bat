cd %~dp0
ffmpeg -i %1 -t 60 "60s_%~nx1"
rem ffmpeg -i %1 -c:v libx264 -b:v 600k -c:a aac -b:a 128k %~n1.mp4
pause