// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function signalPlugin(name) {

  var data = [];
  var timestamps = [];
  var unitLabel = 'units';
  var bufferSize=1024;
  var cycles =10;
  var bufferhead=0;
  var buffertail=0;
  var pluginthis = this;
  var sampleTimer;
  var lastdata = 150;
  var lasttick=0;
  var cycleSize = (bufferSize/cycles); // samples/ cycle

  var controls = { 
      timeslice : { datatype : 'float', label: 'Time Slice', units : 'seconds', value : '0.001', defaultValue : '0.001', readonly : false}, 
      waveform : { datatype : 'select', label: 'Waveform', units : 'wavetype', choices: ['Sine','Triangle','Square','Unity','Random'], value : 'Sine', defaultValue : 'Sine', readonly: false},
      mode : { datatype : 'select', label: 'Mode', units : 'generator', choices: ['Wave','Stream'], value : 'Wave', defaultValue : 'Wave', readonly: false}
  }

  this.name = name;
  this.units = unitLabel;
  this.onReset;
  this.onUpdate;
  this.bufferType = 'PERIODIC';
  this.deltaT = 0;
  this.offset=0;
  this.maxValue=300;
  this.minValue=0;

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

  function scale( value, range) {
    return value*( pluginthis.maxValue/range);
  }

  function getSample() {
    if(buffertail-1 >0) lastdata = data[buffertail-1];
    var phi = (lasttick % cycleSize)/cycleSize;
    data[buffertail++]=makedata(phi);
    if(buffertail >= bufferSize) buffertail=0;
    bufferhead=buffertail+1;
    lasttick = (lasttick+1) % cycleSize;
  }

  var lastdata = pluginthis.maxValue/2;
  function initBuffer() {
    lastdata=pluginthis.maxValue/2;
    pluginthis.deltaT = controls.timeslice.value;
    if(controls.mode.value=='Stream') {
      bufferhead=0;
      buffertail=0;
      if(!sampleTimer) {
        sampleTimer=setInterval(getSample,100) 
        console.log('Setting Timer '+sampleTimer);
      }
    } else {
      if(sampleTimer) {
        console.log('Clearing Timer '+sampleTimer);
         clearInterval(sampleTimer);
         sampleTimer=null;
      }
      for(var i=0;i<bufferSize;i++) {
        var phi = (i % cycleSize)/cycleSize;
        data[i] = makedata(phi);
      }
      bufferhead=0;
      buffertail=bufferSize-1;
    }
  }

  function makedata(phi) {
     var d=0;
     var wavetype = controls.waveform.value;
     if(wavetype=='Sine') d = scale( Math.sin(Math.PI*2*phi)+1, 2 );
     else if(wavetype=='Triangle') d = scale(phi,1 );
     else if(wavetype=='Square') d = scale( Math.round(phi),1 );
     else if(wavetype=='Unity') d = pluginthis.maxValue/2;
     else if(wavetype=='Random') d = makerand(lastdata);
     lastdata=d;
     return d;
  }

  function makerand(lastvalue) {
    var d = (pluginthis.maxValue/2 - lastvalue)/pluginthis.maxValue; //-0.5 to 0.5 dist from middle
    var newval = lastvalue+(Math.random()-.5)*(pluginthis.maxValue/6);
    if(newval <0) newval=0;
    if(newval >pluginthis.maxValue) newval=pluginthis.maxValue;
    return newval;
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

