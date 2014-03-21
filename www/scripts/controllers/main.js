'use strict';

/* jshint jquery: true, browser: true, globalstrict: true */
/* global _, signalPlugin, audioPlugin, createSerialPlugin, angular, console */

var htmlScopeApp = angular.module('htmlScopeApp');
htmlScopeApp.controller('MainCtrl', function ($scope, slidenav) {
    $scope.screens = ['home', 'sources', 'settings', 'about', 'debug'];
    $scope.selectedScreen = 'home';


    var theTimer;

    $scope.channels = [];
    for (var i = 0; i < 4; i++) {
        var channel = {
            number: i,
            active: false,
            buffer: {},
            srcType: 'audio',
            srcOptions: null,
        };
        $scope.channels.push(channel);
    }
    $scope.channels[0].active = true;
    $scope.channels[1].active = false;

    $scope.isPlaying = false;
    $scope.tscale = 1000; // 1000 means ms 1e6 would mean us.
    $scope.trange = 30;
    $scope.vrange = 1;
    $scope.voffset = -0.5;
    $scope.show_cursors = true;
    $scope.tcursor1 = -20;
    $scope.tcursor2 = -40;


    $scope.srcDefaults = {
        simulated: {
            waveform: "Sine",
            timeslice: 0.001,
            mode: "Stream"
        },
        audio: {
            channel: "Left",
            gain: 1,
            timeslice: 0.001
        },
        serial: {}
    };


    // WATCHES
    $scope.$watch('trange', redrawPlot);
    $scope.$watch('vrange', redrawPlot);
    $scope.$watch('voffset', redrawPlot);

    $scope.$watch('tcursor1', updatePlot);
    $scope.$watch('tcursor2', updatePlot);


    $scope.sourceFactories = {
        simulated: function () {
            return new signalPlugin('sim_src');
        },
        audio: function () {
            return new audioPlugin('audio_src');
        },
        serial: function () {
            return createSerialPlugin('serial_src');
        },
    };

    $scope.srcTypes = Object.keys($scope.sourceFactories);


    $scope.channels.forEach(function (channel) {
        if (!channel.active)
            return;
        selectSource(channel.number, 'audio');
    });
    //updateSrcOptions(1, {
    //    waveform: "Triangle"
    //});

    setTmpChannel(0);

    // plot settings for flot lib
    $scope.settings = {
        series: {
            shadowSize: 0 // Drawing is faster without shadows
        },
        yaxis: {},
        xaxis: {}
    };

    // Init the plot
    //updateControls();
    updateData();
    //redrawPlot();

    ////////////////////////////////////// Functions /////////////////////////////////////////////////

    // Exposed functions
    $scope.selectSource = selectSource;
    $scope.setTmpChannel = setTmpChannel;
    $scope.updateSrcOptions = updateSrcOptions;
    $scope.playPause = playPause;
    $scope.applySrcSelection = applySrcSelection;

    function selectSource(channelNum, srcType, opts) {
        var channel = $scope.channels[channelNum];
        channel.srcType = srcType;
        var srcFactory = $scope.sourceFactories[srcType];
        var src = srcFactory();
        src.init();
        opts = opts || $scope.srcDefaults[srcType];
        src.setControls(opts);
        channel.srcOptions = _.clone(opts);
        channel.datasource = src;
    }

    function applySrcSelection() {
        var ch = $scope.tmpChannel;
        if (!ch.active) {
            $scope.channels[ch.number].active = false;
            return;
        }
        selectSource(ch.number, ch.srcType, ch.srcOptions);
        selectScreen('home');
    }



    function setTmpChannel(channelNum) {
        var ch = _.pick($scope.channels[channelNum], 'number', 'active', 'srcType');
        ch.srcType = $scope.channels[channelNum].srcType;
        ch.srcOptions = _.clone($scope.channels[channelNum].srcOptions);
        ch.srcOptions = ch.srcOptions || $scope.srcDefaults[ch.srcType];
        $scope.tmpChannel = ch;
    }


    function updateData() {
        $scope.channels.forEach(function (channel) {
            if (!channel.active) return;
            channel.buffer = channel.datasource.getData();
        });
    }

    function updateSrcOptions(channelNum, opts) {
        var channel = $scope.channels[channelNum];
        if (!channel.datasource)
            return;
        _.extend(channel.srcOptions, opts);
        channel.datasource.setControls(channel.srcOptions);
    }

    function updateControls() {
        $scope.datasource.setControls($scope.signalOptions);
        if (!$scope.isPlaying) {
            //redrawPlot();
        }
    }

    $scope.nextFrame = nextFrame;

    function nextFrame(fullRedraw) {
        $scope.isReady = true;
        updateData();
        //redrawPlot();
        if (fullRedraw) {
            redrawPlot();
        } else {
            updatePlot();
        }
    }

    // Update only the data without redrawing axes.
    function updatePlot() {
        if (!$scope.isReady) return;
        var plot = $scope.plot;
        var lines = prepLines();
        plot.setData(lines);
        // Since the axes don't change, we don't need to call plot.setupGrid()
        plot.draw();
    }

    // Get new data and massage it properly to be fed to flot.plot.
    function prepData(channel) {
        var t, v;
        var dt = Number(channel.datasource.deltaT);
        var len = Math.ceil($scope.trange / (dt * $scope.tscale));
        var dlen = channel.buffer.data.length;
        if (len > dlen) {
            len = dlen;
        }

        var plotData = [];

        for (var i = 0; i < len; i++) {
            t = -dt * i * $scope.tscale;
            v = channel.buffer.data[dlen - 1 - i];
            //t = $scope.buffer.time[dlen-1-i] * $scope.tscale;
            plotData.push([t, v]);
        }
        return plotData;
    }

    function prepLines() {
        var lines = [];
        var ymin = $scope.voffset;
        var ymax = $scope.voffset + $scope.vrange;

        var tcursor1 = [[$scope.tcursor1, ymin], [$scope.tcursor1, ymax]];
        var tcursor2 = [[$scope.tcursor2, ymin], [$scope.tcursor2, ymax]];

        $scope.channels.forEach(function (channel) {
            if (!channel.active) return;
            var plotData = prepData(channel);
            lines.push(plotData);
        });

        if ($scope.show_cursors) {
            lines.push(tcursor1);
            lines.push(tcursor2);
        }
        return lines;
    }

    // Redraw the entire plot with axes and cursors
    $scope.redrawPlot = redrawPlot;

    function redrawPlot() {
        if (!$scope.isReady) return;
        var lines;

        var ymin = $scope.voffset;
        var ymax = $scope.voffset + $scope.vrange;

        var settings = $scope.settings;
        settings.yaxis.min = ymin;
        settings.yaxis.max = ymax;
        settings.xaxis.min = -$scope.trange;
        settings.xaxis.max = 0;

        //$scope.datasource.setControls($scope.signalOptions);

        lines = prepLines();
        $scope.plot = $.plot("#graph-inner", lines, settings);
    }


    function pause() {
        if ($scope.isPlaying) {
            clearInterval(theTimer);
            $scope.isPlaying = false;
        }
    }


    function playPause(shouldPlay) {
        if ($scope.isPlaying) {
            clearInterval(theTimer);
            $scope.isPlaying = false;
            // Redraw the entire plot to show cursors.
            //redrawPlot();
        } else {
            theTimer = setInterval(nextFrame, 100);
            $scope.isPlaying = true;
        }
    }

    $scope.changeTrange = changeTrange;

    function changeTrange(direction) {
        $scope.trange = changeLogVal($scope.trange, direction);
    }

    // Move to next or prev value in the following series
    // ... 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50 .....
    // There must be a simpler way.
    $scope.changeLogVal = changeLogVal;

    function changeLogVal(valueName, direction) {
        var value = $scope[valueName];
        if (direction > 0) value *= 2;
        else value /= 2;

        var zeros = Math.floor(Math.log(value) / Math.LN10 * 1.001);
        var scale = Math.pow(10, zeros);
        var msd = value / scale;
        if (msd < 1.5) msd = 1;
        else if (msd <= 3) msd = 2;
        else if (msd <= 7.5) msd = 5;
        else msd = 10;
        $scope[valueName] = msd * scale;
    }

    $scope.changRelVal = changRelVal;

    function changRelVal(valueName, step, direction) {
        var value = $scope[valueName];
        var newValue = step * (Math.round(value / step) + direction);
        $scope[valueName] = newValue;
    }

    ///////// Navigation functions
    $scope.selectScreen = selectScreen;

    function selectScreen(screen) {
        if (_.contains($scope.screens, screen)) {
            if ($scope.selectedScreen == 'home' && screen !== 'home')
                pause();
            $scope.selectedScreen = screen;
            $scope.closeSideNav();
        } else {
            console.error("Invalid screen selection " + screen);
        }
    }

    $scope.closeSideNav = function () {
        slidenav.close();
    };

    $scope.toggleSideNav = function () {
        if (slidenav.isOpen()) {
            slidenav.close();
        } else {
            slidenav.open();
        }
    };
});