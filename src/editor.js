const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const util = require('./util.js');
const terminal = require('./terminal.js');

function getUnrealEditorCommand(info) {
    return new Promise((resolve, reject) => {
        let engineRootPath = info.engineRootPath;

        if (!engineRootPath) {
            reject('Invalid or unset ue4-cpptools.engineRootPath');
        } else {
            let platformPaths = {
                'linux' : 'Linux',
                'win32' : 'Win64',
                'darwin' : 'IOS' // untested
            };
            let platformPath = platformPaths[process.platform];
            let unrealEditor = path.join(engineRootPath, 'Engine', 'Binaries', platformPath, 'UE4Editor.exe');
            
            fs.access(unrealEditor, (err) => {
                if (err) {
                    reject(`Failed to access Unreal Editor '${unrealEditor}' : ${err}`);
                } else {
                    resolve(unrealEditor);
                }
            });
        }
    });
}

function getEditorCommand(info, args) {
    return new Promise((resolve, reject) => {
        let overrideUnrealEditor = info.overrideUnrealEditor;
        
        if (overrideUnrealEditor) {
            resolve({'command':overrideUnrealEditor, 'args':args});
        } else {
            getUnrealEditorCommand(info).then((command) => {
                resolve({'command':command, 'args':args});
            }, (err) => {
                reject(err);
            });
        }
    });
}

function launchEditor(info, args) {
    return new Promise((resolve, reject) => {
        getEditorCommand(info, args).then((command) => {
            terminal.execCommandInProcess(command.command, command.args).then((ok) => {
                resolve();
            }, (err) => {
                reject(`Failed to launch editor : Exited with error code ${err}`);
            });
        }).catch((err) => {
            reject(err);
        });
    });
}

function openProjectWithEditor() {
    util.getProjectInfo().then((info) => {
        let args = [
            info.projectFilePath
        ];

        let buildConfiguration = info.buildConfiguration;
        
        if (buildConfiguration == 'DebugGame') {
            args.push('-debug');
            vscode.window.showInformationMessage(`Opening project build 'DebugGame', your current build configuration`);
        } else if (buildConfiguration != 'Development') {
            vscode.window.showWarningMessage(`Opening project build 'Development', not your current build configuration '${buildConfiguration}'`);
        }

        launchEditor(info, args).catch((err) => {
            vscode.window.showErrorMessage(`Failed to open project with editor : ${err}`);
        });
    });
}
exports.openProjectWithEditor = openProjectWithEditor;

function runProjectWithEditor() {
    util.getProjectInfo().then((info) => {
        let args = [
            info.projectFilePath,
            '-game'
        ];

        let buildConfiguration = info.buildConfiguration;

        if (buildConfiguration == 'DebugGame') {
            args.push('-debug');
            vscode.window.showInformationMessage(`Running project build 'DebugGame', your current build configuration`);
        } else if (buildConfiguration != 'Development') {
            vscode.window.showWarningMessage(`Running project build 'Development', not your current build configuration '${buildConfiguration}'`);
        }
        
        launchEditor(info, args).catch((err) => {
            vscode.window.showErrorMesage(`Failed to run project with editor : ${err}`);
        });
    });
}
exports.runProjectWithEditor = runProjectWithEditor;
