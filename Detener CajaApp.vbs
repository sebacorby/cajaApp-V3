Option Explicit

Dim shell, fso, projectRoot, launcherPath, command, exitCode, logPath

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectRoot = fso.GetParentFolderName(WScript.ScriptFullName)
launcherPath = fso.BuildPath(fso.BuildPath(projectRoot, "runtime"), "cajaapp-production.ps1")
logPath = fso.BuildPath(fso.BuildPath(fso.BuildPath(projectRoot, "runtime"), "logs"), "latest.log")

If Not fso.FileExists(launcherPath) Then
    MsgBox "No se encontro el lanzador interno de CajaApp:" & vbCrLf & launcherPath, vbCritical, "CajaApp"
    WScript.Quit 2
End If

command = "powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & launcherPath & """ -Action Stop"
exitCode = shell.Run(command, 0, True)

If exitCode <> 0 Then
    MsgBox "CajaApp no pudo detenerse por completo." & vbCrLf & vbCrLf & _
           "El diagnostico sincronizado quedo en:" & vbCrLf & logPath, _
           vbExclamation, "CajaApp"
End If

WScript.Quit exitCode
