const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const util = require('./util.js');
const terminal = require('./terminal.js');

function getUnrealBuildToolCommand(info) {
    return new Promise((resolve, reject) => {
        let engineRootPath = info.engineRootPath;

        if (!engineRootPath) {
            reject('Invalid or unset ue4-cpptools.engineRootPath');
        } else {
            let unrealBuildTool = path.join(engineRootPath, 'Engine', 'Binaries', 'DotNET', 'UnrealBuildTool.exe');
            
            fs.access(unrealBuildTool, (err) => {
                if (err) {
                    reject(`Failed to access Unreal Build Tool '${unrealBuildTool}' : ${err}`);
                } else {
                    resolve(unrealBuildTool);
                }
            });
        }
    });
}

function getBuildCommand(info, args) {
    return new Promise((resolve, reject) => {
        let overrideUnrealBuildTool = info.overrideUnrealBuildTool;
        
        if (overrideUnrealBuildTool) {
            resolve({'command':overrideUnrealBuildTool, 'args':args});
        } else {
            getUnrealBuildToolCommand(info).then((command) => {
                if (process.platform == 'linux' || process.platform == 'darwin') {
                    // Linux and Mac requires us to prepend 'mono'
                    args.unshift(command);
                    command = 'mono';
                }
    
                resolve({'command':command, 'args':args});
            }, (err) => {
                reject(err);
            });
        }
    });
}

function runBuildTool(info, args, taskName) {
    getBuildCommand(info, args).then((command) => {
        terminal.runCommandInTerminal(command.command, command.args, taskName);
    }, (err) => {
        vscode.window.showErrorMessage(`${err}`);
    });
}

function buildProjectArgs(info) {
    let buildConfigurationTarget = info.buildConfigurationTarget;
    if (!buildConfigurationTarget || buildConfigurationTarget == 'Game') {
        buildConfigurationTarget = '';
    }
    
    let args = [
        info.projectName + buildConfigurationTarget,
        info.buildPlatform,
        info.buildConfiguration,
        info.projectFilePath
    ];

    return args;
}

function buildProject() {
    util.getProjectInfo().then((info) => {
        let args = buildProjectArgs(info);
        
        runBuildTool(info, args, 'ue4-cpptools:BuildProject');
        util.showIndicator(`Build Project : ${info.buildPlatform} ${info.buildConfiguration} ${info.buildConfigurationTarget}`)
    });
}
exports.buildProject = buildProject;

function generateProjectFilesArgs(info, generateNativeProjectFiles=true, generateCodeLiteProjectFiles=false, generateEngineProjectFiles=true) {
    let args = [];

    if (generateNativeProjectFiles) {
        let nativeProjectFiles = { // TODO setting ue4-cpptool.nativeProjectFiles
            'linux' : ['-makefile', '-kdevelopfile', '-qmakefile', '-cmakefile', '-codelitefile'],
            'win32' : ['-projectfiles'],
            'darwin' : ['xcodeprojectfile']
        };

        args = args.concat(nativeProjectFiles[process.platform]);
    }

    if (generateCodeLiteProjectFiles) {
        if (!args.find((v) => {return v == '-codelitefile'})) args.push('-codelitefile');
    }

    args = args.concat([
        '-project=',
        info.projectFilePath,
        '-game',
        '-rocket'
    ]);

    if (generateEngineProjectFiles) {
        args.push('-engine');
    }

    return args;
}

function generateProjectFiles() {
    util.getProjectInfo().then((info) => {
        let args = generateProjectFilesArgs(info, true);
        
        runBuildTool(info, args, 'ue4-cpptools:GenerateProjectFiles');
        util.showIndicator('Generate Project Files');
    });
}
exports.generateProjectFiles = generateProjectFiles;

function execGenerateProjectFilesProcess(generateNativeProjectFiles=false, generateCodeLiteProjectFiles=false, generateEngineProjectFiles=false) {
    return new Promise((resolve, reject) => {
        util.getProjectInfo().then((info) => {
            let args = generateProjectFilesArgs(info, generateNativeProjectFiles, generateCodeLiteProjectFiles, generateEngineProjectFiles);
            
            getBuildCommand(info, args).then((command) => {
                terminal.execCommandInProcess(command.command, command.args).then(
                (ok) => {
                    resolve();
                },(err) => {
                    reject(`Failed to generate project files : Exited with error code ${err}`);
                });
            }).catch((err) => {
                reject(err);
            });
        }); 
    });
}
exports.execGenerateProjectFilesProcess = execGenerateProjectFilesProcess;

function cleanProject() {
    util.getProjectInfo().then((info) => {
        let args = buildProjectArgs(info);
        args.push('-clean');

        runBuildTool(info, args, 'ue4-cpptools:BuildProject');
        util.showIndicator(`Clean Project : ${info.buildPlatform} ${info.buildConfiguration} ${info.buildConfigurationTarget}`);
    });
}
exports.cleanProject = cleanProject;

function rebuildProject() {
    util.getProjectInfo().then((info) => {
        let args = buildProjectArgs(info);
        args.push('-clean');

        getBuildCommand(info, args).then((command) => {
            return vscode.window.withProgress({'title':`Clean Project : ${info.buildPlatform} ${info.buildConfiguration} ${info.buildConfigurationTarget}`, 'location':vscode.ProgressLocation.Window}, (progress) => {
                return new Promise((resolve, reject) => {
                    terminal.execCommandInProcess(command.command, command.args).then(
                    (ok) => {
                        resolve();
                    },(err) => {
                        reject(`Failed to clean project : Exited with error code ${err}`);
                    });
                });
            });
        }).then(_ => {
            buildProject();
        }).catch((err) => {
            reject(err);
        });
    });  
}
exports.rebuildProject = rebuildProject;