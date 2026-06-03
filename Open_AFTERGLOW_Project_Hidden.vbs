Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

ProjectDir = FSO.GetParentFolderName(WScript.ScriptFullName)
BatPath = ProjectDir & "\Open_AFTERGLOW_Project.bat"

' 0 = hidden window, False = do not wait for the BAT to finish
WshShell.Run Chr(34) & BatPath & Chr(34), 0, False
