var _ = require('lodash');

//  Parameters:
//    _test: The parent jsHarmonyTestScreenshot object
function jsHarmonyTestScreenshotSpec(_test,_id){
  this.test = _test;   //The parent jsHarmonyTestScreenshot object todo ????
  this.id = _id;       //Computed field, should be set by parent
  this.url = ""; //Relative or absolute URL, including querystring
  this.batch = '';
  this.x = 0;
  this.y = 0;
  // this.width = _this.DEFAULT_SCREENSHOT_SIZE[0];
  this.width= 950;
  this.height = 700;
  this.browserWidth = null;
  this.browserHeight = null;
  this.trim = true;
  this.resize = null; //{ width: xxx, height: yyy }
  this.postClip = null; //{ x: 0, y: 0, width: xxx, height: yyy }
  this.cropToSelector = null; //".selector"
  this.onload = function(){}; //function(){ return new Promise(function(resolve){ /* FUNCTION_STRING */ }); }
  this.beforeScreenshot = null; //function(jsh, page, cb, cropRectangle){ /* FUNCTION_STRING */ }
  this.waitBeforeScreenshot = 0;
  this.exclude = [
    //Rectangle: { x: ###, y: ###, width: ###, height: ### },
    //Selector: { selector: ".C_ID" }
  ];
  
  
}

//Parse a JSON object and return a jsHarmonyTestScreenshotSpec object
//  Ensure the spec is correct and has no extra fields
//  Parameters:
//    _test: The parent jsHarmonyTestScreenshot object
//    obj: The JSON object
//Returns a jsHarmonyTestScreenshotSpec object
jsHarmonyTestScreenshotSpec.prototype.fromJSON = function(test, obj){
  const conf = _.extend({},this.test.settings.base_screenshot,obj);
  _.assign(this,conf);
  return this;
}

jsHarmonyTestScreenshotSpec.prototype.generateFilename = function(){
    //Generate file name
    var fname = this.id;
    if(this.width) fname += '_' + this.width;
    if(this.height) fname += '_' + this.height;
    fname += '.png';
    return fname;
}

//Generate a screenshot and save to the target file
//  Parameters:
//    browser: A puppeteer Browser object
//    fpath: The full path to the destination file
//    cb: The callback function to be called on completion
//If this.test.config.server is undefined, use the following logic to get the server path:
//var port = jsh.Config.server.http_port;
//if(jsh.Servers['default'] && jsh.Servers['default'].servers && jsh.Servers['default'].servers.length) port = jsh.Servers['default'].servers[0].address().port;

// jsHarmonyTestScreenshot.prototype.generateScreenshot = function(browser, fpath, cb){
// }

module.exports = exports = jsHarmonyTestScreenshotSpec;
