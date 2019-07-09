// This hook expects that the framework dependency is defined on plugin.xml.
// Example: 
// <platform name="ios">
//     <!-- .... -->
//     <framework src="path/to/FRAMEWORK_NAME.framework" custom="true" embed="true" />
// </platform>
// For the OutSystems platform it is better to add this hook on both events. As so:
// <platform name="ios">
//     <!-- .... -->
//     <hook type="after_plugin_install" src="path/to/thishook/embed_framework_hook.js" />
//     <hook type="before_build" src="path/to/thishook/embed_framework_hook.js" />
// </platform>

module.exports = function (ctx) {

    // IMPORTANT!!
    // Replace the following var with the correct name of the .framework file to be embed
    var frameworkName = "TwilioVideo.framework"

    var fs = ctx.requireCordovaModule("fs");
    var path = ctx.requireCordovaModule("path");
    var xcode = ctx.requireCordovaModule("xcode");
    var deferral = ctx.requireCordovaModule('q').defer();

    /**
     * Recursively search for file with the tiven filter starting on startPath
     */
    function searchRecursiveFromPath(startPath, filter, rec, multiple) {
        if (!fs.existsSync(startPath)) {
            console.log("no dir ", startPath);
            return;
        }

        var files = fs.readdirSync(startPath);
        var resultFiles = []
        for (var i = 0; i < files.length; i++) {
            var filename = path.join(startPath, files[i]);
            var stat = fs.lstatSync(filename);
            if (stat.isDirectory() && rec) {
                fromDir(filename, filter); //recurse
            }

            if (filename.indexOf(filter) >= 0) {
                if (multiple) {
                    resultFiles.push(filename);
                } else {
                    return filename;
                }
            }
        }
        if (multiple) {
            return resultFiles;
        }
    }

    /**
     * find a PBXFileReference on the provided project by its name
     */
    function findPbxFileReference(project, pbxFileName) {
        for (var uuid in project.hash.project.objects.PBXFileReference) {
            if (uuid.endsWith("_comment")) {
                continue;
            }
            var file = project.hash.project.objects.PBXFileReference[uuid];

            if (file.name !== undefined && file.name.indexOf(pbxFileName) != -1) {
                return file;
            }
        }
    }

    if (process.length >= 5 && process.argv[1].indexOf('cordova') == -1) {
        if (process.argv[4] != 'ios') {
            return; // plugin only meant to work for ios platform.
        }
    }

    var xcodeProjPath = searchRecursiveFromPath('platforms/ios', '.xcodeproj', false);
    var projectPath = xcodeProjPath + '/project.pbxproj';
    console.log("Found", projectPath);

    var proj = xcode.project(projectPath);
    proj.parseSync();



    var frameworkPbxFileRef = findPbxFileReference(proj, frameworkName);
    // Clean extra " on the start and end of the string
    var frameworkPbxFileRefPath = frameworkPbxFileRef.path;
    if (frameworkPbxFileRefPath.endsWith("\"")) {
        frameworkPbxFileRefPath = frameworkPbxFileRefPath.substring(0, frameworkPbxFileRefPath.length - 1);
    }
    if (frameworkPbxFileRefPath.startsWith("\"")) {
        frameworkPbxFileRefPath = frameworkPbxFileRefPath.substring(1, frameworkPbxFileRefPath.length);
    }

    // If the build phase doesn't exist, add it
    if (proj.pbxEmbedFrameworksBuildPhaseObj(proj.getFirstTarget().uuid) == undefined) {
        console.log("BuildPhase not found in XCode project. Adding PBXCopyFilesBuildPhase - Embed Frameworks");
        proj.addBuildPhase([], 'PBXCopyFilesBuildPhase', "Embed Frameworks", proj.getFirstTarget().uuid, 'frameworks');
    }

    // Now remove the framework
    var removedPbxFile = proj.removeFramework(frameworkPbxFileRefPath, {
        customFramework: true
    });
    // Re-add the framework but with embed
    var addedPbxFile = proj.addFramework(frameworkPbxFileRefPath, {
        customFramework: true,
        embed: true,
        sign: true
    });


    fs.writeFile(proj.filepath, proj.writeSync(), 'utf8', function (err) {
        if (err) {
            deferral.reject(err);
            return;
        }
        console.log("finished writing xcodeproj");
        deferral.resolve();
    });

    return deferral.promise;
};