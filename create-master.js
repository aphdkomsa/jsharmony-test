// var jsHarmonyTestScreenshot = require("./jsHarmonyTestScreenshot.js");
// console.log('test');
// var jsh = 'fvff';
// var _test_config_path = 'test';
// var _test_data_path = 'test/data';
// var jshTS = new jsHarmonyTestScreenshot(jsh,_test_config_path, _test_data_path);
//
// jshTS.generateMaster(function () {
//   console.log('master generated');
// });


global.curtest.generateMaster(function(){
  console.log('master generated');
});
//--or--
//curtest.runComparison(function(){ /* callback */ });