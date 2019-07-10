var fs = require('fs');
var path = require('path');

var rootdir = process.argv[2];

function replace_string_in_file(filename, to_replace, replace_with) {
    var data = fs.readFileSync(filename, 'utf8');
    var result = data.replace(to_replace, replace_with);
    fs.writeFileSync(filename, result, 'utf8');
}

var folderPaths = {
    cordovaAndroid6: "platforms/android/src/com/ekreative/cordova/videoconversations",
    cordovaAndroid7: "platforms/android/app/src/main/java/com/ekreative/cordova/videoconversations"
};

function fileExists(filePath) {
    try {
        return fs.statSync(filePath);
    } catch (error) {
        return false;
    }
}

function returnPath() {
    var cordovaAndroid6Path = folderPaths.cordovaAndroid6;
    var cordovaAndroid7Path = folderPaths.cordovaAndroid7;

    if (fileExists(cordovaAndroid6Path)) {
        return cordovaAndroid6Path;
    } else if (fileExists(cordovaAndroid7Path)) {
        return cordovaAndroid7Path;
    } else {
        return undefined;
    }
}

var target = "stage";
if (process.env.TARGET) {
    target = process.env.TARGET;
}

    var ourconfigfile = path.join( "plugins", "android.json");
    var configobj = JSON.parse(fs.readFileSync(ourconfigfile, 'utf8'));
  // Add java files where you want to add R.java imports in the following array

    var basePath = returnPath();
    
    var filestoreplace = [
        basePath + "/ConversationActivity.java",
        basePath + "/Dialog.java"
    ];
    filestoreplace.forEach(function(val, index, array) {
        console.log("path:" + val);
        if (fs.existsSync(val)) {
          console.log("Android platform available !");
          //Getting the package name from the android.json file,replace with your plugin's id
          var packageName = configobj.installed_plugins["cordova.plugin.twilio.video"]["PACKAGE_NAME"];
          console.log("With the package name: "+packageName);
          console.log("Adding import for R.java");
            replace_string_in_file(val,"package cordova.plugin.twilio.video;","package cordova.plugin.twilio.video;\n\nimport "+packageName+".R;");

        } else {
            console.log("No android platform found! :(");
        }
    });
