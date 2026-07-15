' Launches MiniFlow with NO console window and NO taskbar entry.
' Used by the Startup shortcut (install-autostart.ps1) and can also be
' double-clicked to start MiniFlow silently any time.
'
' It resolves its own location, so it keeps working no matter where the
' MiniFlow folder lives — nothing is hard-coded.
Option Explicit

Dim fso, shell, scriptDir, appDir, electronExe
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

' This file lives in <app>\scripts\ , so the app dir is one level up.
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
appDir = fso.GetParentFolderName(scriptDir)
electronExe = appDir & "\node_modules\electron\dist\electron.exe"

If Not fso.FileExists(electronExe) Then
    MsgBox "MiniFlow isn't installed yet." & vbCrLf & _
           "Open PowerShell in the miniflow folder and run:  npm install", _
           vbExclamation, "MiniFlow"
    WScript.Quit 1
End If

shell.CurrentDirectory = appDir
' Run electron on the app in this folder. 0 = hidden window, False = don't wait.
shell.Run """" & electronExe & """ .", 0, False
