var _ = require('lodash');
var path = require('path');
var gm = require('jsharmony/lib/gm');
var imageMagic = gm.subClass({imageMagick: true});

//  Parameters:
//    _test: The parent jsHarmonyTestScreenshot object
function jsHarmonyTestScreenshotSpec(_test,_id){
  this.test = _test;   //The parent jsHarmonyTestScreenshot object
  this.id = _id;       //Computed field, should be set by parent
  this.url = ""; //Relative or absolute URL, including querystring
  this.batch = '';
  this.x = 0;
  this.y = 0;
  this.width= 950;
  this.height = 700;
  this.browserWidth = null;
  this.browserHeight = null;
  this.trim = true;
  this.resize = null; //{ width: xxx, height: yyy }
  this.postClip = null; //{ x: 0, y: 0, width: xxx, height: yyy }
  this.cropToSelector = null; //".selector"
  this.onload = function(){}; //function(){ return new Promise(function(resolve){ /* FUNCTION_STRING */ }); }
  this.beforeScreenshot = null; //function(jsh, page, cb){ /* FUNCTION_STRING */ } //todo check continue
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
jsHarmonyTestScreenshotSpec.fromJSON = function(test, id, obj,){
  let jsTS = new jsHarmonyTestScreenshotSpec(test,id);
  const conf = _.extend({},test.settings.base_screenshot,obj);
  _.assign(jsTS,conf);
  return jsTS;
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
jsHarmonyTestScreenshotSpec.prototype.generateScreenshot = async function (browser, fpath, cb) {
  let _this = this;
  let fname = this.generateFilename();
  if (!path.isAbsolute(fpath)) fpath = path.join(this.basepath, fpath);
  fpath = path.join(fpath, fname);
  if (!this.browserWidth) this.browserWidth = this.x + this.width;
  if (!this.browserHeight) this.browserHeight = this.height;
  
  var getCropRectangle = function (selector) {  // todo check !!!!
    document.querySelector('html').style.overflow = 'hidden';
    if (!selector) return null;
    return new Promise(function (resolve) {  // todo do we need to wait here ? continue
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
  let cropRectangle = null;
  try {
    let page = await browser.newPage();
    var fullurl = 'http://localhost:' + _this.test.port + _this.url;
    console.log(fullurl);
    await page.setViewport({
      width: parseInt(this.browserWidth),
      height: parseInt(this.browserHeight)
    });
    await page.goto(fullurl);
    if (this.test.settings.cookies){
      await page.setCookie(...this.test.settings.cookies);
    }
    if (!_.isEmpty(this.onload)){
      eval( 'var func_onload = ' + this.onload);
      await page.evaluate(func_onload);
    }
    if (this.cropToSelector){
      cropRectangle = await page.evaluate(getCropRectangle, this.cropToSelector);
    }
    var screenshotParams = {path: fpath, type: 'png'};
    if (cropRectangle) this.postClip = cropRectangle;
    if (this.height) {
      screenshotParams.clip = {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height
      };
    } else screenshotParams.fullPage = true;
    if(this.waitBeforeScreenshot){
      await sleep(this.waitBeforeScreenshot);
    }
    if (!_.isEmpty(this.beforeScreenshot)){ //todo review do we need this ?  is it not the same as onload , based on functions in ejs files, in spec it is to run on backend. ?
        // beforeScreenshot:function(jsh, page, cb){
        //     page.click('.xsearch_column').then(cb).catch(function (err) { jsh.Log.error(err); });
        // }
        // eval( 'var func_beforeScreenshot = ' + this.beforeScreenshot);
        // await func_beforeScreenshot(this.test.jsh,page);
    }
    await page.screenshot(screenshotParams);
    await this.processScreenshot(fpath, _this);
    await page.close();
    if(cb) return cb();
  }catch (e) {
    this.test.jsh.Log.error(e);
    if(cb) return cb();
  }
}

jsHarmonyTestScreenshotSpec.prototype.processScreenshot = function (fpath, params) {
  return new Promise((resolve, reject) => {
    var img = imageMagic(fpath);
    if (params.postClip) img.crop(params.postClip.width, params.postClip.height, params.postClip.x, params.postClip.y);
    if (params.trim) img.trim();
    if (params.resize) {
      img.resize(params.resize.width || null, params.resize.height || null);
    }
    //Compress PNG
    img.quality(1003);
    img.setFormat('png');
    img.noProfile().write(fpath, function (err) {
      if (err) return reject(err);
      return resolve();
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = exports = jsHarmonyTestScreenshotSpec;
