var jsHarmonyTest = require("./jsHarmonyTest.js");
var _ = require('lodash');

//  Parameters:
//    jsh: The jsHarmony Server object
//    _test_config_path: Path to the test screenshot config folder
//    _test_data_path:   Path to the test screenshot data folder
function jsHarmonyTestScreenshot(_jsh, _test_config_path, _test_data_path){
  this.jsh = _jsh;
  this.browser = null;
  this.test_config_path = ((_.isEmpty(_test_config_path))? '/test/screenshot':_test_config_path);
  this.test_data_path = ((_.isEmpty(_test_data_path))? '/data/test/screenshot':_test_data_path);
  this.settings = {
    server: undefined,
    cookies: {}
  };
}

jsHarmonyTestScreenshot.prototype = new jsHarmonyTest();

//Generate the "master" set of screenshots, in the "test_data_path/master" folder
//  Parameters:
//    cb - The callback function to be called on completion
//Delete the contents of the test_data_path/master folder, if it exists.  Do not delete the folder itself.
//Create the test_data_path/master folder tree, if necessary
jsHarmonyTestScreenshot.prototype.generateMaster = function(cb){
  return cb();
}

//Run the full "comparison" test
//  Parameters:
//    cb - The callback function to be called on completion
//Delete the "test_data_path/comparison" folder, if it exists before running.  Do not delete the folder itself.
//Delete the "test_data_path/diff" folder, if it exists before running.  Do not delete the folder itself.
//Delete the "test_data_path/screenshot.result.html" file, if it exists before running
jsHarmonyTestScreenshot.prototype.runComparison = function(cb){
}

//Read the test_config_path folder, and parse the tests
//  Parameters:
//    cb - The callback function to be called on completion
//Returns an associative array of jsHarmonyTestScreenshotSpec:
//{
//  “SCREENSHOT_NAME”: jsHarmonyTestScreenshotSpec Object
//}
//Go through jsh.getModelDirs(), and for each folder, parse the tests in test_config_path
//Set test.id to SCREENSHOT_NAME
//Sort tests by test.batch, then by test.id.  Undefined batch should run last
jsHarmonyTestScreenshot.prototype.loadTests = function(cb){
}

//Parse a string and return a jsHarmonyTestScreenshotSpec object
//  Parameters:
//    fpath: The full path to the config file
//    cb - The callback function to be called on completion
//Returns a jsHarmonyTestScreenshotSpec object
//Use jsh.ParseJSON to convert the string to JSON
jsHarmonyTestScreenshot.prototype.parseTest = function(fpath, cb){
}

//Generate screenshots of an array of tests, and save into a target folder
//  Parameters:
//    tests: An associative array of jsHarmonyTestScreenshotSpec objects
//    fpath: The full path to the target folder
//    cb: The callback function to be called on completion
//The fpath should be the same as the SCREENSHOT_NAME
jsHarmonyTestScreenshot.prototype.generateScreenshots = function(tests, fpath, cb){
}

//Generate the "comparison" set of screenshots, in the "test_data_path/comparison" folder
//  Parameters:
//    cb - The callback function to be called on completion
//Create the test_data_path/comparison folder tree, if necessary
jsHarmonyTestScreenshot.prototype.generateComparison = function(cb){
}

//Generate the "diff" image for any screenshots that are not exactly equal, into the "test_data_path/diff" folder
//  Parameters:
//    path_master: Path to the folder containing the master images
//    path_comparison: Path to the folder containing the comparison images
//    cb - The callback function to be called on completion
//  Returns an array of Differences:
//  [
//    {
//      image_file: 'image_name.png', //File name of comparison image
//      diff_type: 'DIFF_TYPE',       //One of: 'MASTER_ONLY', 'COMPARISON_ONLY', 'IMAGE_DIFF'
//       diff_file: 'image_name.png'   //File name of the diff image (should be the same as the comparison image)
//    }
//  ]
//Create the test_data_path/diff folder tree, if necessary
jsHarmonyTestScreenshot.prototype.compareImages = function(path_master, path_comparison, cb){
}

//Generate the "test_data_path/screenshot.result.html" report
//  Parameters:
//    diff: Output from compareImages function
//    cb - The callback function to be called on completion
//Use jsh.getEJS('jsh_test_screenshot_report') to get the report source
jsHarmonyTestScreenshot.prototype.generateReport = function(diff, cb){
}

//Generate the "test_data_path/screenshot.result.html" report
//  Parameters:
//    diff: Output from compareImages function
//    cb - The callback function to be called on completion
//Use jsh.getEJS('jsh_test_screenshot_error_email') to get the email source
//Use jsh.Config.error_email for the target email address
//Implement a similar function to Logger.prototype.sendErrorEmail (jsHarmony)
jsHarmonyTestScreenshot.prototype.sendErrorEmail = function(diff, cb){
}

module.exports = exports = jsHarmonyTestScreenshot;
