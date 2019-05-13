var jsHarmonyTest = require("./jsHarmonyTest.js");
var jsHarmonyTestSpec = require("./jsHarmonyTestScreenshotSpec.js");
var _ = require('lodash');
var puppeteer = require('jsharmony/lib/puppeteer');
var ejs = require('ejs');
var fs = require('fs');
var path = require('path');
var async = require('async');
var HelperFS = require('jsharmony/HelperFS');
var gm = require('jsharmony/lib/gm');
var imageMagic = gm.subClass({imageMagick: true});

//  Parameters:
//    jsh: The jsHarmony Server object
//    _test_config_path: Path to the test screenshot config folder
//    _test_data_path:   Path to the test screenshot data folder
function jsHarmonyTestScreenshot(_jsh, _test_config_path, _test_data_path) {
  
  this.jsh = _jsh;
  this.basepath = this.jsh.Config.appbasepath; // todo get later after init
  this.port = _jsh.Servers['default'].servers[0].address().port;
  this.browser = null;
  this.data_folder = 'data';
  this.test_folder = 'test';
  this.default_test_config_path = path.join(this.test_folder, 'screenshot');
  this.default_test_data_config_path = path.join(this.basepath, this.data_folder, this.default_test_config_path);
  this.screenshots_master_dir = path.join(this.default_test_data_config_path, 'master');
  this.screenshots_comparison_dir = path.join(this.default_test_data_config_path, 'comparison');
  this.screenshots_diff_dir = path.join(this.default_test_data_config_path, 'diff');
  HelperFS.createFolderIfNotExistsSync(path.join(this.basepath, this.data_folder));
  HelperFS.createFolderIfNotExistsSync(path.join(this.basepath, this.data_folder, this.test_folder));
  // HelperFS.createFolderIfNotExistsSync(path.join(this.basepath,this.default_test_data_config_path)); todo folders create !!!!!CONTINUE refactor to passed dir!!!
  this.test_config_path = ((_.isEmpty(_test_config_path)) ? this.default_test_config_path : _test_config_path);
  this.test_data_path = ((_.isEmpty(_test_data_path)) ? this.default_test_data_config_path : _test_data_path);  // todo to check why do we need this at all ? can it be in one specific dir?
  this.result_file = path.join(this.default_test_data_config_path, 'screenshots.result.html');
  
  this.settings = {
    server: undefined,
    cookies: [],
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

jsHarmonyTestScreenshot.prototype = new jsHarmonyTest();

//Generate the "master" set of screenshots, in the "test_data_path/master" folder
//  Parameters:
//    cb - The callback function to be called on completion
//Delete the contents of the test_data_path/master folder, if it exists.  Do not delete the folder itself.
//Create the test_data_path/master folder tree, if necessary
jsHarmonyTestScreenshot.prototype.generateMaster = async function (cb) {
  HelperFS.rmdirRecursiveSync(this.screenshots_master_dir);
  HelperFS.createFolderIfNotExistsSync(this.screenshots_master_dir);
  await this.readGlobalConfig();
  let tests = await this.loadTests();
  return await this.generateScreenshots(tests, path.join(this.default_test_data_config_path, 'master'), cb);
}

//Generate the "comparison" set of screenshots, in the "test_data_path/comparison" folder
//  Parameters:
//    cb - The callback function to be called on completion
//Create the test_data_path/comparison folder tree, if necessary
jsHarmonyTestScreenshot.prototype.generateComparison = async function (cb) {
  let _this = this;
  HelperFS.rmdirRecursiveSync(_this.screenshots_comparison_dir);
  HelperFS.createFolderIfNotExistsSync(_this.screenshots_comparison_dir);
  await _this.readGlobalConfig();
  let tests = await _this.loadTests();
  await _this.generateScreenshots(tests, _this.screenshots_comparison_dir);
  if (cb) return cb();
}

jsHarmonyTestScreenshot.prototype.readGlobalConfig = async function () {
  try {
    const conf = fs.readFileSync(path.join(this.default_test_config_path, '_config.json'));
    this.settings = _.merge(this.settings, JSON.parse(conf.toString()));
  } catch (e) {
    if (e.code === 'ENOENT'){
      console.log("Global _config.json file not found in directory: "+this.default_test_config_path);
    }else{
      this.jsh.Log.error(e);
    }
  }
}

jsHarmonyTestScreenshot.prototype.getBrowser = async function () {
  try {
    this.browser = await puppeteer.launch(
      {
        ignoreHTTPSErrors: true , ignoreDefaultArgs: ['--hide-scrollbars'], headless: true
      }
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
jsHarmonyTestScreenshot.prototype.runComparison = async function (cb) {
  let _this = this;
  await this.generateComparison();
  HelperFS.rmdirRecursiveSync(this.screenshots_diff_dir);
  HelperFS.createFolderIfNotExistsSync(this.screenshots_diff_dir);
  let failImages = [];
  let files = fs.readdirSync(this.screenshots_master_dir);
  let files_comp = fs.readdirSync(this.screenshots_comparison_dir);
  console.log('# of existing images to test ' + files.length);
  console.log('# of generated images to test ' + files_comp.length);
  let files_not_in_master = _.difference(files_comp, files);
  if (files_not_in_master.length) {
    files_not_in_master.forEach(function (imageName) {
      failImages[imageName] = {name: imageName, reason: 'Master image was not generated'};
    })
  }
  console.log('# of master images NOT generated ' + files_not_in_master.length);
  async.eachLimit(files, 2,
    function (imageName, each_cb) {
      if (!fs.existsSync(path.join(_this.screenshots_comparison_dir, imageName))) {
        failImages[imageName] = {name: imageName, reason: 'New image was not generated'};
        return each_cb();
      } else {
        return _this.compareImages(imageName, 0)
          .then(function (isEqual) {
            if (!isEqual) {
              failImages[imageName] = {name: imageName, reason: 'Images are not the same.'};
              return _this.compareImages(imageName, {file: path.join(_this.screenshots_diff_dir, imageName)})
                .then(
                  function () {
                    return each_cb();
                  });
            } else {
              return each_cb();
            }
          })
          .catch(function (e) {
            failImages[imageName] = {name: imageName, reason: 'Comparison Error: ' + e.toString()};
            return each_cb();
          });
      }
    }
    , function (err) {
      if (err) _this.jsh.Log.error(err);
      console.log('# fail: ' + _.keys(failImages).length);
      _this.generateReport(failImages)
        .then(function (html) {
          fs.writeFile(_this.result_file, html, function (err) {
            if (err) _this.jsh.Log.error(err);
            console.log("Report successfully Written to File.");
            if (cb) return cb();
          });
        })
        .catch(function (err) {
          if (err) _this.jsh.Log.error(err);
          if (cb) return cb();
        });
    });
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
jsHarmonyTestScreenshot.prototype.loadTests = async function () {
  let _this = this;
  let tests = [];
  try {
    let test_files = fs.readdirSync(this.test_config_path); // todo recursive ??? and only *.json ?
    _.each(test_files,function (fname) {
      if (fname === "_config.json") return;
      let file_content = fs.readFileSync(path.join(_this.test_config_path, fname));
      let test_group = _this.getTestsGroupName('',fname);
      let file_tests = JSON.parse(file_content.toString());
      let file_test_specs = [];
      for (const file_test_id in file_tests) {
        const testSpec = jsHarmonyTestSpec.fromJSON(_this, test_group + '_' + file_test_id, file_tests[file_test_id]);
        file_test_specs.push(testSpec);
      }
      file_test_specs.sort(function (a, b) {
        if (a.batch && b.batch) return a.batch - b.batch;
        if (!a.batch && b.batch) return 1;
        if (a.batch && !b.batch) return -1;
        return 0;
      });
      tests = _.concat(tests, file_test_specs);
    });
  } catch (e) {
    _this.jsh.Log.error(e);
  }
  return tests;
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
// jsHarmonyTestScreenshot.prototype.parseTest = function (fpath, cb) {
// }

//Generate screenshots of an array of tests, and save into a target folder
//  Parameters:
//    tests: An associative array of jsHarmonyTestScreenshotSpec objects
//    fpath: The full path to the target folder
//    cb: The callback function to be called on completion
//The fpath should be the same as the SCREENSHOT_NAME
jsHarmonyTestScreenshot.prototype.generateScreenshots = async function (tests, fpath, cb) {
  await this.getBrowser();
  let _this = this;
  await new Promise((resolve,reject) => {
    async.eachLimit(tests, 1,
      async function (screenshot_spec) {
        await screenshot_spec.generateScreenshot(_this.browser, fpath);
      },
      function (err) {
        if (err) {
          _this.jsh.Log.error(err);
          reject(err);
        }
        _this.browser.close();
        resolve();
      });
  });
  if (cb) return cb();
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
jsHarmonyTestScreenshot.prototype.compareImages = function (imageName, options) {
  return this.gmCompareImagesWrapper(
    path.join(this.screenshots_master_dir, imageName),
    path.join(this.screenshots_comparison_dir, imageName),
    options);
}

jsHarmonyTestScreenshot.prototype.gmCompareImagesWrapper = function (srcpath, cmppath, options) {
  return new Promise((resolve, reject) => {
    //Resized version of cmppath, to be the same size as srcpath
    let cmppath_srcsize = cmppath + '.srcsize.png';
    //Compare function
    let fcmp = function (_cmppath) {
      if (!_cmppath) _cmppath = cmppath;
      imageMagic().compare(srcpath, _cmppath, options, function (err, isEqual, equality, raw) {
        if (err) return reject(err);
        return resolve(isEqual);
      });
    };
    //Check for differences without generating a difference image
    if (!options.file) return fcmp();
    else {
      try {
        //Get sizes of srcpath and cmppath
        var img1 = imageMagic(srcpath);
        var img2 = imageMagic(cmppath);
        img1.size(function (err, size1) {
          if (err) return reject(err);
          img2.size(function (err, size2) {
            if (err) return reject(err);
            //If srcpath and cmppath are the same size, generate the difference image
            if ((size1.width == size2.width) && (size1.height == size2.height)) return fcmp();
            //Crop cmppath to be the same as srcpath, and save to cmppath_srcsize
            img2.autoOrient();
            img2.crop(size1.width, size1.height, 0, 0);
            img2.extent(size1.width, size1.height);
            img2.repage(0, 0, 0, 0);
            img2.noProfile().write(cmppath_srcsize, function (err) {
              if (err) console.log(err);
              if (err) return reject(err);
              img2 = imageMagic(cmppath_srcsize);
              //Make sure that cmppath_srcsize is the same size as srcsize
              img2.size(function (err, size2) {
                if (err) return reject(err);
                //Generate the difference image
                if ((size1.width == size2.width) && (size1.height == size2.height)) return fcmp(cmppath_srcsize);
                return reject(new Error('Sizes still not the same after resize'));
              });
            });
          });
        });
      } catch (ex) {
        return reject(ex);
      }
    }
  })
}


//Generate the "test_data_path/screenshot.result.html" report
//  Parameters:
//    diff: Output from compareImages function
//    cb - The callback function to be called on completion
//Use jsh.getEJS('jsh_test_screenshot_report') to get the report source
jsHarmonyTestScreenshot.prototype.generateReport = async function (failImages) {
  return new Promise((resolve, reject) => {
    ejs.renderFile(
      path.join(__dirname, 'views/test_results.ejs'),
      {
        screenshots_source_dir: this.screenshots_master_dir,
        screenshots_generated_dir: this.screenshots_comparison_dir,
        screenshots_diff_dir: this.screenshots_diff_dir,
        failImages: failImages,
      },
      {},
      function (err, str) {
        console.log('Report generated');
        if (err) return reject(err);
        return resolve(str);
      }
    );
  })
}

//Generate the "test_data_path/screenshot.result.html" report
//  Parameters:
//    diff: Output from compareImages function
//    cb - The callback function to be called on completion
//Use jsh.getEJS('jsh_test_screenshot_error_email') to get the email source
//Use jsh.Config.error_email for the target email address
//Implement a similar function to Logger.prototype.sendErrorEmail (jsHarmony)
// jsHarmonyTestScreenshot.prototype.sendErrorEmail = function (diff, cb) {
// }

exports = module.exports = jsHarmonyTestScreenshot;