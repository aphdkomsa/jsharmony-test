var jsHarmonyTest = require("./jsHarmonyTest.js");
var jsHarmonyTestSpec = require("./jsHarmonyTestScreenshotSpec.js");
var _ = require('lodash');
var puppeteer = require('puppeteer');
// var ejs = require('ejs');
var fs = require('fs');
var path = require('path');
var async = require('async');
var HelperFS = require('/Users/dzmitrykomsa/projects/clone-jsharmony/HelperFS.js');
var imagick = require('gm').subClass({imageMagick: true});

//  Parameters:
//    jsh: The jsHarmony Server object
//    _test_config_path: Path to the test screenshot config folder
//    _test_data_path:   Path to the test screenshot data folder
function jsHarmonyTestScreenshot(_jsh, _test_config_path, _test_data_path, run_all) {
  
  this.jsh = _jsh;
  this.basepath = this.jsh.Config.appbasepath;
  this.port = _jsh.Servers['default'].servers[0].address().port;
  this.browser = null;
  this.run_all = (run_all !== false);
  this.default_test_config_path = 'test/screenshot';
  this.default_test_data_config_path = 'data/' + this.default_test_config_path;
  HelperFS.createFolderIfNotExistsSync(path.join(this.basepath,'data'));
  HelperFS.createFolderIfNotExistsSync(path.join(this.basepath,'data/test',));
  HelperFS.createFolderIfNotExistsSync(path.join(this.basepath,this.default_test_data_config_path));
  
  this.test_config_path = ((_.isEmpty(_test_config_path)) ? this.default_test_config_path : _test_config_path);
  this.test_data_path = ((_.isEmpty(_test_data_path)) ? this.default_test_data_config_path : _test_data_path);
  this.settings = {
    server: undefined,
    cookies: {},
    base_screenshot: {
      // "url": "",  // must be provided from config file should not be included here
      // "batch": "",
      // "x": "0",
      // "y": "0",
      // "width": "950",
      // "height": "700",
      // "beforeScreenshot": "",  // Server-side JS code
      // "onload": "", // In-browser JS code
      // "cropToSelector": "", // .C_ID
      // "postClip": {},
      // "postClip":   {
      //   "x": "1",
      //   "y": "1",
      //   "width": "1",
      //   "height": "1"
      // },
      // "trim": true, // true | false
      // "exclude": []
      // "exclude": [
      //   {
      //     "x": "1",
      //     "y": "1",
      //     "width": "1",
      //     "height": "1"
      //   },
      //   {
      //     "selector": ""
      //   }
      // ]
      // }
    }
  };
}

// puppeteer.launch({ ignoreHTTPSErrors: true, ignoreDefaultArgs: [ '--hide-scrollbars' ] /*, headless: false*/ })
//   .then(function(browser){
//   HelperFS.funcRecursive(_this.tutfolder,function(filepath, relativepath, file_cb){
//     //For each File
//     fs.readFile(filepath, 'utf8', function(err, txt){
//       if(err) return file_cb(err);
//
//       var screenshots = [];
//
//       ejs.render(txt, {
//         req: null,
//         getScreenshot: function(url, desc, params){ screenshots.push( { url: url, desc: desc, params: params } ); },
//         instance: '',
//         _: _
//       });
//
//       async.eachLimit(screenshots, 1, function(screenshot, screenshot_cb){
//         _this.generateScreenshot(browser, screenshot.url, screenshot.desc, screenshot.params, screenshot_cb);
//       }, function(err){
//         if(err){ jsh.Log.error(err); }
//         return file_cb();
//       });
//     });
//   },undefined,undefined,function(){
//     browser.close();
//     return callback();
//   });
// }).catch(function(err){ jsh.Log.error(err); });


jsHarmonyTestScreenshot.prototype = new jsHarmonyTest();

//Generate the "master" set of screenshots, in the "test_data_path/master" folder
//  Parameters:
//    cb - The callback function to be called on completion
//Delete the contents of the test_data_path/master folder, if it exists.  Do not delete the folder itself.
//Create the test_data_path/master folder tree, if necessary
jsHarmonyTestScreenshot.prototype.generateMaster = async function (cb) {
  
  HelperFS.createFolderIfNotExistsSync(path.join(this.default_test_data_config_path, 'master'));
  
  await this.readGlobalConfig();
  
  await this.getBrowser();
  let tests = await this.loadTests();
  if (this.browser) {
      return await this.generateScreenshots(tests, path.join(this.default_test_data_config_path, 'master'),cb);
  }
}

//Generate the "comparison" set of screenshots, in the "test_data_path/comparison" folder
//  Parameters:
//    cb - The callback function to be called on completion
//Create the test_data_path/comparison folder tree, if necessary
jsHarmonyTestScreenshot.prototype.generateComparison = async function (cb) {
  await this.readGlobalConfig();
  
  HelperFS.createFolderIfNotExistsSync(path.join(this.basepath,this.default_test_data_config_path, 'comparison'));
  
  await this.getBrowser();
  let tests = await this.loadTests();
  if (this.browser) {
    return await this.generateScreenshots(tests, path.join(this.default_test_data_config_path, 'comparison'),cb);
  }
}

jsHarmonyTestScreenshot.prototype.readGlobalConfig = async function () {
  try {
    const conf = fs.readFileSync(path.join(this.default_test_config_path, '_config.json'));
    this.settings = _.merge(this.settings, JSON.parse(conf.toString()));
  } catch (e) {
    this.jsh.Log.error(e);
  }
}

jsHarmonyTestScreenshot.prototype.getBrowser = async function () {
  try {
    this.browser = await puppeteer.launch(
      {ignoreHTTPSErrors: true, ignoreDefaultArgs: ['--hide-scrollbars'] /*, headless: false*/}
    );
  } catch (e) {
    this.jsh.Log.error(e);
  }
  return this.browser;
}

//Run the full "comparison" test
//  Parameters:
//    cb - The callback function to be called on completion
//Delete the "test_data_path/comparison" folder, if it exists before running.  Do not delete the folder itself.
//Delete the "test_data_path/diff" folder, if it exists before running.  Do not delete the folder itself.
//Delete the "test_data_path/screenshot.result.html" file, if it exists before running
jsHarmonyTestScreenshot.prototype.runComparison = function (cb) {
  return cb();
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
jsHarmonyTestScreenshot.prototype.loadTests = async function (cb) {
  let _tests = {};
  let tests = {};
  let f_t = [];
  const modules = this.jsh.getModelDirs();
  for (let i = 0; i < modules.length; i++) {
    
    modules[i].test_dir = path.join(modules[i].path, '../', this.test_config_path);
    
    try {
      modules[i].test_files = fs.readdirSync(modules[i].test_dir);
      for (let j = 0; j < modules[i].test_files.length; j++) {
        var tests_group = this.getTestsGroupName(modules[i].module, modules[i].test_files[j]);
        if (!_.isEmpty(tests_group)) {
          try {
            let file_content = fs.readFileSync(path.join(modules[i].test_dir, modules[i].test_files[j]));
            _tests[tests_group] = JSON.parse(file_content.toString()); //  todo refactor to tests  ????
          } catch (e) {
            this.jsh.Log.error(e);
          }
        }
      }
    } catch (e) {
      modules[i].test_files = [];
    }
  }
  for (const t_group in _tests) {
    tests[t_group] = [];
    for (const t in _tests[t_group]) {
      const testSpec = new jsHarmonyTestSpec(this, t_group + '_' + t);
      testSpec.fromJSON(this, _tests[t_group][t]);
      tests[t_group].push(testSpec);
    }
    tests[t_group].sort(function (a, b) {
      if (a.batch && b.batch) return a.batch - b.batch;
      if (!a.batch && b.batch) return 1;
      if (a.batch && !b.batch) return -1;
      return 0;
    });
  }
  
  
  await Object.values(tests).forEach(function (value) {
  f_t = _.concat(f_t,value);
  });
  // cb(); // todo ????
  return f_t;
}

jsHarmonyTestScreenshot.prototype.getTestsGroupName = function (module, file_name) {
  
  
  if (file_name === '_config.json') {
    return null;
  }
  let name = module + '_' + file_name;
  return name.replace(/[^0-9A-Za-z]/g, "_");
}

//Parse a string and return a jsHarmonyTestScreenshotSpec object
//  Parameters:
//    fpath: The full path to the config file
//    cb - The callback function to be called on completion
//Returns a jsHarmonyTestScreenshotSpec object
//Use jsh.ParseJSON to convert the string to JSON   todo redundant ???
jsHarmonyTestScreenshot.prototype.parseTest = function (fpath, cb) {
}

//Generate screenshots of an array of tests, and save into a target folder
//  Parameters:
//    tests: An associative array of jsHarmonyTestScreenshotSpec objects
//    fpath: The full path to the target folder
//    cb: The callback function to be called on completion
//The fpath should be the same as the SCREENSHOT_NAME
jsHarmonyTestScreenshot.prototype.generateScreenshots = async function (tests, fpath, cb) {
  let _this = this;
  return async.eachLimit(tests, 4, function (screenshot_spec, screenshot_cb) {
        _this.generateScreenshot(_this.browser, screenshot_spec, fpath,screenshot_cb);
    },cb);
}

jsHarmonyTestScreenshot.prototype.generateScreenshot = async function (browser, screenshotScpec, fpath, cb) {
  
  let _this = this;
  // console.log(_this);
  // var fname = this.getScreenshotFilename(url, desc, params);
  let fname = screenshotScpec.generateFilename();
  // var fpath = _this.default_test_data_config_path;
  if(!path.isAbsolute(fpath)) fpath = path.join(_this.basepath, fpath);
  fpath = path.join(fpath, fname);
  //Do not generate screenshot if image already exists
  // if (
  if (!screenshotScpec.browserWidth) screenshotScpec.browserWidth = screenshotScpec.x + screenshotScpec.width;
  if (!screenshotScpec.browserHeight) screenshotScpec.browserHeight = screenshotScpec.height;
  
  
  var getCropRectangle = function (selector) {  // todo check
    document.querySelector('html').style.overflow = 'hidden';
    if (!selector) return null;
    return new Promise(function (resolve) {
      if (!jshInstance) return resolve();
      var $ = jshInstance.$;
      var jobjs = $(selector);
      if (!jobjs.length) return resolve();
      var startpos = null;
      var endpos = null;
      for (var i = 0; i < jobjs.length; i++) {
        var jobj = $(jobjs[i]);
        var offset = jobj.offset();
        
        var offStart = {left: offset.left - 1, top: offset.top - 1};
        var offEnd = {left: offset.left + 1 + jobj.outerWidth(), top: offset.top + 1 + jobj.outerHeight()};
        
        if (!startpos) startpos = offStart;
        if (offStart.left < startpos.left) startpos.left = offStart.left;
        if (offStart.top < startpos.top) startpos.top = offStart.top;
        
        if (!endpos) endpos = offEnd;
        if (offEnd.left > endpos.left) endpos.left = offEnd.left;
        if (offEnd.top > endpos.top) endpos.top = offEnd.top;
      }
      return resolve({
        x: startpos.left,
        y: startpos.top,
        width: endpos.left - startpos.left,
        height: endpos.top - startpos.top
      });
    });
  }
  
  return browser.newPage().then(function (page) {
    var fullurl = 'http://localhost:' + _this.port + screenshotScpec.url;
    console.log(fullurl);
    page.setViewport({
      width: parseInt(screenshotScpec.browserWidth),
      height: parseInt(screenshotScpec.browserHeight)
    }).then(function () {
      page.goto(fullurl).then(function () {
        page.evaluate(screenshotScpec.onload).then(function () {
          page.evaluate(getCropRectangle, screenshotScpec.cropToSelector).then(function (cropRectangle) {
            var takeScreenshot = function () {
              setTimeout(function () {
                console.log(fname);
                var screenshotParams = {path: fpath, type: 'png'};
                if (cropRectangle) screenshotScpec.postClip = cropRectangle;
                if (screenshotScpec.height) {
                  screenshotParams.clip = {
                    x: screenshotScpec.x,
                    y: screenshotScpec.y,
                    width: screenshotScpec.width,
                    height: screenshotScpec.height
                  };
                } else screenshotParams.fullPage = true;
                page.screenshot(screenshotParams).then(function () {
                  _this.processScreenshot(fpath, screenshotScpec, function (err) {
                    if (err) _this.jsh.Log.error(err);
                    page.close().then(function () {
                      return cb();
                    }).catch(function (err) {
                      _this.jsh.Log.error(err);
                    });
                  });
                }).catch(function (err) {
                  _this.jsh.Log.error(err);
                });
              }, screenshotScpec.waitBeforeScreenshot);
            }
            if (screenshotScpec.beforeScreenshot) {
              screenshotScpec.beforeScreenshot(this.jsh, page, takeScreenshot, cropRectangle);
            } else takeScreenshot();
          }).catch(function (err) {
            _this.jsh.Log.error(err);
          });
        }).catch(function (err) {
          _this.jsh.Log.error(err);
        });
      }).catch(function (err) {
        _this.jsh.Log.error(err);
      });
    }).catch(function (err) {
      _this.jsh.Log.error(err);
    });
  }).catch(function (err) {
    _this.jsh.Log.error(err);
  });
}

jsHarmonyTestScreenshot.prototype.processScreenshot = function(fpath, params, callback){
  var img = imagick(fpath);
  if(params.postClip) img.crop(params.postClip.width, params.postClip.height, params.postClip.x, params.postClip.y);
  if(params.trim) img.trim();
  if(params.resize){
    img.resize(params.resize.width||null, params.resize.height||null);
  }
  //Compress PNG
  img.quality(1003);
  img.setFormat('png');
  img.noProfile().write(fpath, callback);
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
jsHarmonyTestScreenshot.prototype.compareImages = function (path_master, path_comparison, cb) {
}

//Generate the "test_data_path/screenshot.result.html" report
//  Parameters:
//    diff: Output from compareImages function
//    cb - The callback function to be called on completion
//Use jsh.getEJS('jsh_test_screenshot_report') to get the report source
jsHarmonyTestScreenshot.prototype.generateReport = function (diff, cb) {
}

//Generate the "test_data_path/screenshot.result.html" report
//  Parameters:
//    diff: Output from compareImages function
//    cb - The callback function to be called on completion
//Use jsh.getEJS('jsh_test_screenshot_error_email') to get the email source
//Use jsh.Config.error_email for the target email address
//Implement a similar function to Logger.prototype.sendErrorEmail (jsHarmony)
jsHarmonyTestScreenshot.prototype.sendErrorEmail = function (diff, cb) {
}

module.exports = exports = jsHarmonyTestScreenshot;
