const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function touchDirectory(directoryPath) {
    return new Promise((resolve, reject) => {
        let dir = path.normalize(directoryPath);

        fs.mkdir(dir, (err) => {
            if (err && err.code !== 'EEXIST') {
                reject(`Failed to touch directory '${path}' : ${err.code}`);
            } else {
                resolve(dir);
            }
        });
    });
}
exports.touchDirectory = touchDirectory;

function getProjectInfo() {
    return new Promise((resolve, reject) => {
        let workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || !workspaceFolders[0]) {
            reject('No workspace folder open');
            return;
        }

        let uri = workspaceFolders[0].uri;
        if (!uri || !uri.fsPath) {
            reject('Invalid workspace folder path');
            return;
        }
        
        let projectPath = uri.fsPath;

        let projectName = projectPath.slice(projectPath.lastIndexOf(path.sep) + 1);
        if (!projectName || projectName.length < 1) {
            reject('Failed to retrieve project name');
            return;
        }

        let projectFileName = projectName + '.uproject';

        let projectFilePath = path.join(projectPath, projectFileName);

        let engineRootPath = vscode.workspace.getConfiguration('ue4-cpptools').get('engineRootPath') || process.env.UE4_ENGINE_ROOT_PATH;
        
        let configurationName = vscode.workspace.getConfiguration('ue4-cpptools').get('configurationName');
        if (!configurationName) {
            let configurationPlatforms = {
                'win32' : 'UE4-Windows',
                'linux' : 'UE4-Linux',
                'darwin' : 'UE4-Mac'
            }
            configurationName = configurationPlatforms[process.platform];
        }

        let overrideUnrealBuildTool = vscode.workspace.getConfiguration('ue4-cpptools').get('overrideUnrealBuildTool');

        let buildConfigurations = vscode.workspace.getConfiguration('ue4-cpptools').get('buildConfigurations');
        if (!buildConfigurations || buildConfigurations.length < 1) {
            buildConfigurations = [
                'Development',
                'DebugGame'
            ];
        }

        let buildConfigurationTargets = vscode.workspace.getConfiguration('ue4-cpptools').get('buildConfigurationTargets');
        if (!buildConfigurationTargets || buildConfigurationTargets.length < 1) {
            buildConfigurationTargets = [
                'Editor'
            ];
        }

        let buildPlatforms = {
            'linux' : 'Linux',
            'win32' : 'Win64',
            'darwin' : 'Mac'
        };
        let buildPlatform = buildPlatforms[process.platform]; 
        
        let overrideUnrealEditor = vscode.workspace.getConfiguration('ue4-cpptools').get('overrideUnrealEditor');

        // TODO get automatically (ex. from UE4Editor.version)
        let engineVersion = vscode.workspace.getConfiguration('ue4-cpptools').get('engineVersion');

        let info = {
            'projectPath' : projectPath,
            'projectName' : projectName,
            'projectFilePath' : projectFilePath,
            'engineRootPath' : engineRootPath,
            'engineVersion' : engineVersion,

            'configurationName' : configurationName,

            'overrideUnrealBuildTool' : overrideUnrealBuildTool,

            'buildConfigurations' : buildConfigurations,

            'buildConfigurationTargets' : buildConfigurationTargets,

            'buildPlatform' : buildPlatform,

            'overrideUnrealEditor' : overrideUnrealEditor
        };

        resolve(info);
    });
}
exports.getProjectInfo = getProjectInfo;

function showIndicator(title, duration=2500) {
    return vscode.window.withProgress({'title':title, 'location':vscode.ProgressLocation.Window}, (progress) => {
        return new Promise((resolve) => {
            setInterval(() => {
                resolve();
            }, duration);
        });
    });
}
exports.showIndicator = showIndicator;