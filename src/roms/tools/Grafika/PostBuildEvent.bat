@echo off
@rem copy manifest file over
echo Copying manifest to target dir ...
copy "C:\Documents and Settings\Lars\Desktop\timanthes\src\\PaintDotNet.exe.manifest" "C:\Documents and Settings\Lars\Desktop\timanthes\src\bin\Debug\\"

@rem copy RotateZoom.dll over
mkdir "C:\Documents and Settings\Lars\Desktop\timanthes\src\bin\Debug\\Effects"
copy "C:\Documents and Settings\Lars\Desktop\timanthes\src\\Effects\RotateZoom\bin\Debug\RotateZoom.dll" "C:\Documents and Settings\Lars\Desktop\timanthes\src\bin\Debug\\Effects"

@rem create Rotate Zoom sample zip
pushd "C:\Documents and Settings\Lars\Desktop\timanthes\src\"
call MakeRZZip.bat "Debug"
popd

:done
if errorlevel 1 goto CSharpReportError
goto CSharpEnd
:CSharpReportError
echo Project error: A tool returned an error code from the build event
exit 1
:CSharpEnd