var _ = require('lodash');
var path = require('path');
var gm = require('jsharmony/lib/gm');
var imageMagic = gm.subClass({imageMagick: true});

//  Parameters:
//    _test: The parent jsHarmonyTestScreenshot object
function jsHarmonyTestScreenshotSpec(_test,_id){
  this.test = _test;   //The parent jsHarmonyTestScreenshot object
  this.base_url = 'http://localhost:' + this.test.port;
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
  this.beforeScreenshot = null; //function(jsh, page, cb){ /* FUNCTION_STRING */ }
  this.waitBeforeScreenshot = 0;
  this.exclude = [
    //Rectangle: { x: ###, y: ###, width: ###, height: ### },
    //Selector: { selector: ".C_ID" }
  ];
}

const getSelectorRectangle = function (selector) {
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

const addElement = function (elem) {
  document.querySelector('html').style.overflow = 'hidden';
  if (!elem) return null;
  if (!jshInstance) return null;
  var $ = jshInstance.$;
  var _elem = $(elem);
  $('html').append(_elem);
}

const excludeElem = async function(exl,page){
  var excludeRectangle = (exl['selector']) ? await page.evaluate(getSelectorRectangle, exl['selector']): exl;
  if(!excludeRectangle) {
    console.log('Selector "'+exl['selector']+'" not exist on the page');
    return;
  }
  let div = generateHoverDiv(excludeRectangle);
  await page.evaluate(addElement, div);
}

const sleep = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const generateHoverDiv = function(dimensions){
  let d = "<div style='background-color: black; position: absolute; width: {{width}}px; height: {{height}}px; top:{{top}}px; left: {{left}}px;'></div>";
  return d.replace("{{width}}",dimensions.width)
    .replace("{{height}}",dimensions.height)
    .replace("{{top}}",dimensions.y)
    .replace("{{left}}",dimensions.x);
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
  fpath = path.join(fpath, fname);
  if (!this.browserWidth) this.browserWidth = this.x + this.width;
  if (!this.browserHeight) this.browserHeight = this.height;
  
  let cropRectangle = null;
  try {
    let page = await browser.newPage();
    var fullurl = _this.base_url+ _this.url;
    console.log(fullurl);
    await page.setViewport({
      width: parseInt(this.browserWidth),
      height: parseInt(this.browserHeight)
    });
    if (this.test.settings.cookies){
      await page.goto(_this.base_url+'/');
      await page.setCookie(...this.test.settings.cookies);
    }
    var resp = await page.goto(fullurl);
    var screenshotParams = {path: fpath, type: 'png'};
    // console.log(resp);
    if (resp._status <="302"){
      if (!_.isEmpty(this.onload)){
        eval( 'var func_onload = ' + this.onload);
        await page.evaluate(func_onload);
      }
      if (this.cropToSelector){
        cropRectangle = await page.evaluate(getSelectorRectangle, this.cropToSelector);
      }
      if (this.exclude.length){
        _.each(this.exclude,async function (exl) {
          await excludeElem(exl,page);
        })
      }
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
      if (!_.isEmpty(this.beforeScreenshot)){
        // beforeScreenshot:function(jsh, page, cb){
        //     page.click('.xsearch_column').then(cb).catch(function (err) { jsh.Log.error(err); return cb() });
        // }
        // "beforeScreenshot": "function(jsh, page, cb){return page.click('.xsearchbutton.xsearchbuttonjsHarmonyFactory_QNSSL1');}"
        eval( 'var func_beforeScreenshot = async ' + this.beforeScreenshot);
        await new Promise( async (resolve) => {
          try{
            await func_beforeScreenshot(this.test.jsh,page,resolve);
          }catch (e) {
            this.test.jsh.Log.error(e);
            resolve();
          }
        });
      }
    }else{
      screenshotParams.fullPage = true;
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

module.exports = exports = jsHarmonyTestScreenshotSpec;