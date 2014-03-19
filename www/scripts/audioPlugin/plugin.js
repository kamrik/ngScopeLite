// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function audioPlugin(name) {

  var data = [];
  var timestamps = [];
  var unitLabel = 'units';
  var bufferSize=1024;
  var cycles =10;
  var maxValue = 300;
  var bufferhead=0;
  var buffertail=0;
  var pluginthis = this;
  var sampleTimer;
  var lastdata = maxValue/2;
  var lasttick=0;
  var cycleSize = (bufferSize/cycles); // samples/ cycle

  var controls = { 
      timeslice : { datatype : 'float', label: 'Time Slice', units : 'seconds', value : '0.001', defaultValue : '0.001', readonly : false}, 
      gain : { datatype : 'float', label: 'Gain', units : 'gain', value : 1, defaultValue : 1 , readonly: false},
      channel : { datatype : 'select', label: 'Channel', units : 'audio', choices: ['Left','Right'], value : 'Left', defaultValue : 'Left', readonly: false}
  }

  this.name = name;
  this.units = unitLabel;
  this.onReset;
  this.onUpdate;
  this.bufferType = 'PERIODIC';
  this.deltaT = 0;
  this.offset=0;
  this.maxValue=1;
  this.minValue=-1;

  this.getData = function() {
    var cdata = [];
    var ctime = [];
    var periodic = true; // for now
    var i=0;
    var j=bufferhead;
    if(bufferhead < buffertail) {
      while(j<buffertail) {
        cdata[i]=data[j];
        if(periodic) ctime[i]=i;
        else ctime[i]=timestamps[j];
        i++;j++;
      }
    } else if(bufferhead>buffertail){
      while(j<bufferSize) {
        cdata[i]=data[j];
        if(periodic) ctime[i]=i;
        else ctime[i]=timestamps[j];
        i++;j++;
      }
      j=0;
      while(j<buffertail) {
        cdata[i]=data[j];
        if(periodic) ctime[i]=i;
        else ctime[i]=timestamps[j];
        i++;j++;
      }
    }
    return {data:cdata,time:ctime,maxValue:pluginthis.maxValue,minValue:pluginthis.minValue,offset:pluginthis.offset};
  }

  this.getControls = function(callback){
    callback(controls);
  }

  this.init = function() {
    setDefaults();
    initBuffer();
  }

  this.setControls = function(valueDictionary) {
    var changed=false;
    for (var key in valueDictionary) {
      if (valueDictionary.hasOwnProperty(key)) {
        if(controls.hasOwnProperty(key)) {
          var value = valueDictionary[key];
          if(isValidData(controls[key].datatype, value)) {
            controls[key].value = valueConvert(controls[key].datatype, value);
            console.log('Setting: '+key+'='+value);
            changed=true;
          }
        }  
      }
    }
    if(changed) {
      initBuffer();
      if(pluginthis.onReset) pluginthis.onReset();
    }
  }


  function record() {
     AudioContext = window.AudioContext || window.webkitAudioContext;
     if(!navigator.getUserMedia) navigator.getUserMedia=navigator.webkitGetUserMedia||navigator.mozGetUserMedia;
     if(!AudioContext || !navigator.getUserMedia) {
       console.log('Audio is not supported');
     } else {
       var context = new AudioContext();

       var processStream = function(stream) {
         console.log('Setting up audio '+channel);
         var microphone = context.createMediaStreamSource(stream);
         pluginthis.recorder = microphone.context.createScriptProcessor(256,2,2);
         console.log('attach processor');

         pluginthis.recorder.onaudioprocess = function(e) {
           var buf = e.inputBuffer.getChannelData(channel);
           for(var i=0;i< buf.length;i++) {
             data[buffertail]=buf[i];
             buffertail= (buffertail+1)%bufferSize;
             bufferhead= (buffertail+1)%bufferSize;
           }
         }
         microphone.connect(pluginthis.recorder);
         // this is required or chrome wont start the stream.
         pluginthis.recorder.connect(context.destination);
       }
       navigator.getUserMedia({audio: true}, processStream, function(e) { console.log('Record Failed: ',e)});
    }
  }

  var channel = 0;
  function initBuffer() {
    if(controls.channel.value=='Right') channel=1;
    else channel=0;
    if(!pluginthis.recorder) record();
  }

  function setDefaults() {
    for(key in controls) {
      if(controls.hasOwnProperty(key)) {
        controls[key].value = controls[key].defaultValue;
      }
    }
  }

  function valueConvert(datatype, value) {
    if(datatype=='int') return parseInt(value);
    else if(datatype=='float') return parseFloat(value);
    return value;
  }

  function isValidData(datatype, value) {
    if(datatype=='int') return !isNaN(value);
    else if(datatype=='float') return !isNaN(value);
    return true;
  }
}

