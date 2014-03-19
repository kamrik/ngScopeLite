// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function basePlugin(name) {

  this.data = [];
  this.timestamps = [];
  this.bufferSize=1024;
  this.bufferhead=0;
  this.buffertail=0;
  var self = this;
  this.sampleTimer;

  this.controls = { 
      timeslice : { datatype : 'float', label: 'Time Slice', units : 'seconds', value : '0.001', defaultValue : '0.001', readonly : false}, 
      gain : { datatype : 'float', label: 'Gain', units : 'gain', value : 1, defaultValue : 1 , readonly: false},
  }

  this.name = name;
  this.units = 'units';
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
    var j=self.bufferhead;
    if(self.bufferhead < self.buffertail) {
      while(j<self.buffertail) {
        cdata[i]=self.data[j];
        if(periodic) ctime[i]=i;
        else ctime[i]=self.timestamps[j];
        i++;j++;
      }
    } else if(self.bufferhead>self.buffertail){
      while(j<self.bufferSize) {
        cdata[i]=self.data[j];
        if(periodic) ctime[i]=i;
        else ctime[i]=self.timestamps[j];
        i++;j++;
      }
      j=0;
      while(j<self.buffertail) {
        cdata[i]=self.data[j];
        if(periodic) ctime[i]=i;
        else ctime[i]=self.timestamps[j];
        i++;j++;
      }
    }
    return {data:cdata,time:ctime,maxValue:self.maxValue,minValue:self.minValue,offset:self.offset};
  }

  this.getControls = function(callback){
    callback( self.controls);
  }

  this.init = function() {
    this.setDefaults();
    this.initBuffer();
  }

  this.setControls = function(valueDictionary) {
    var changed=false;
    for (var key in valueDictionary) {
      if (valueDictionary.hasOwnProperty(key)) {
        if(this.controls.hasOwnProperty(key)) {
          var value = valueDictionary[key];
          if(this.isValidData(this.controls[key].datatype, value)) {
            this.controls[key].value = this.valueConvert(this.controls[key].datatype, value);
            console.log('Setting: '+key+'='+value);
            changed=true;
          }
        }  
      }
    }
    if(changed) {
      this.initBuffer();
    }
  }

  this.initBuffer = function() {
  }

  this.setDefaults = function() {
    for(key in self.controls) {
      if(self.controls.hasOwnProperty(key)) {
        self.controls[key].value = self.controls[key].defaultValue;
      }
    }
  }

  this.valueConvert = function(datatype, value) {
    if(datatype=='int') return parseInt(value);
    else if(datatype=='float') return parseFloat(value);
    return value;
  }

  this.isValidData = function(datatype, value) {
    if(datatype=='int') return !isNaN(value);
    else if(datatype=='float') return !isNaN(value);
    return true;
  }
}

