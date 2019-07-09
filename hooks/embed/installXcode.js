var exec = require('child_process').execSync;

module.exports = function(context) {
    exec('npm i xcode');
};