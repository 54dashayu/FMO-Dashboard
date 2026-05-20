Option Explicit

Dim shell, fso, baseDir, nodeExe, serverScript, command

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

baseDir = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = baseDir & "\runtime\node.exe"
serverScript = baseDir & "\server.mjs"

If Not fso.FileExists(nodeExe) Then
  MsgBox "Node.js runtime was not found. Please use the full portable package.", vbCritical, "FMO Dashboard"
  WScript.Quit 1
End If

If Not fso.FileExists(serverScript) Then
  MsgBox "server.mjs was not found. Please use the full portable package.", vbCritical, "FMO Dashboard"
  WScript.Quit 1
End If

shell.CurrentDirectory = baseDir
command = """" & nodeExe & """ """ & serverScript & """"
shell.Run command, 0, False
