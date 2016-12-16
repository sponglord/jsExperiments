/* global define, console, require*/
define(
    [
        'datgui',
        'jquery'
//        'utils/utils2'
    ],
    function(
        dat,
        $jq
//        Utils
    ){

        "use strict";

        function options(){


            var that = {};

            that.options = {};

            // general
            that.options.numFrequencies = 512;
            that.options.batchModulo = 1;

            that.options.startPosX = 80;
            that.options.spacing = 40;

            that.options.ampMultiplier = 1;
            that.options.boostAmp = false;
            that.options.boostAmpDivider = 5;

            that.options.mapFreqToColor = true;
            that.options.brightColors = true;

            that.options.lineWidth = 1;
            that.options.canvasFillStyle = [ 0, 0, 0];
            that.options.canvasFillAlpha = 0.25;
            that.options.fillStyle = [ 255, 255, 255];
            that.options.strokeStyle = [ 255, 255, 255];

            that.options.linkAlphaToAmplitude = false;
            that.options.invertAlpha = false;


            // barLoop || star || bars
            that.options.numElements = 160; // number of 'ticks' around the circle (barLoop) OR number of 'arms the star has

            // barLoop
            that.options.radius = 200;// radius of the initial circle, the point on the circumference is the centre of the tick bar
            that.options.counterClockwise = false;// which way round to draw the ticks - starting at 'midnight'

            // barLoop || bars || star || circles
            that.options.linkWidthToAmplitude = false;
            that.options.maxLineWidth = 20;

            // star
            that.options.showStarForEachFreq = true;// if true renders one 'star' for every frequency, overlaying them to create a pulsing star effect
            // else renders one 'star' with each arm representing one frequency

            // intersects
            that.options.drawIntersects = true;// if false & drawLines is true makes the effect formerly known as: lines
            that.options.intersectRadius = 2; // disregarded if drawCircles is false
            that.options.doIntersectFill = true; // disregarded if drawCircles is false
            that.options.doIntersectStroke = false; // disregarded if drawCircles is false
            that.options.drawLines = true; // if true makes the effect formerly known as: intersectsLines (needs fillStyle...0.1 & spacing:20)
            that.options.drawLineStyle = [255, 255, 255];
            that.options.intersectLineWidth = 1;
            that.options.clipLines = true;


            that.options.renderCircles = true;
            that.options.renderIntersects = true;


            var __hideArray = [];

            /**
             * Create the dat.gui elements and set onChange behaviours
             * Elements are organised by effect (vizType) - which also influences the behaviours and whether certain
             * elements are visible as other elements change state
             */
            that.init = function(){

                var options = this.options;

                var gui = new dat.GUI({ autoPlace: false, hideable:true });
                var customContainer = document.getElementById('options');
                customContainer.appendChild(gui.domElement);

                gui.remember(options);

                var gen = gui.addFolder('General');

                gen.add(options, 'numFrequencies', 256, 1024).step(256).onChange(function(value) {

                    window.viz.optionChange('numFrequencies', value);
                });

                gen.add(options, 'batchModulo', 1, 40).step(1).onChange(function(value) {

                    window.viz.optionChange('batchModulo', value);
                });

                var maxXPos = $jq('#canvas').width();
                gen.add(options, 'startPosX').max(maxXPos).onChange(function(value) {

                    window.viz.optionChange('startPosX', value);
                });

                gen.add(options, 'spacing').onChange(function(value) {

                    window.viz.optionChange('spacing', value);
                });

                gen.add(options, 'mapFreqToColor').onChange(function(value) {

                    // ONLY DO IF vizType = 'intersects'
                    if(that.vizType === 'intersects' || that.vizType === 'circlesandintersects'){

                        showHideElement('fillStyle', !value); // OPP to this value
                        showHideElement('strokeStyle', !value); // OPP to this value

                        // If we ARE stroking the lines between intersect circles then we should show the drawLineStyle option IF mapFreqToColor is set to false
                        // And hide the drawLineStyle option IF mapFreqToColor is set to true
                        if(that.options.drawLines){

                            showHideElement('drawLineStyle', !value); // OPP to this value

                        }else{

                            // If we're in 'intersects' and NOT stroking the lines between intersect circles then always hide the strokeStyle option
                            showHideElement('drawLineStyle', false);
                        }

                        // Don't show brightColors option if effect is 'intersects'
                        showHideElement('brightColors', false);

                    }// ALL OTHER EFFECTS:
                    else{

                        // Show the strokeStyle option IF mapFreqToColor is set to false
                        // And hide the strokeStyle option IF mapFreqToColor is set to true
                        showHideElement('strokeStyle', !value); // OPP to this value

                        // Show brightColors option
                        showHideElement('brightColors', value);
                    }

                    window.viz.optionChange('mapFreqToColor', value);
                });

                gen.add(options, 'brightColors').onChange(function(value) {

                    window.viz.optionChange('brightColors', value);
                });

                gen.addColor(options, 'fillStyle').onChange(function(value) {

                    // Flaw in dat.gui means values can end up to ±10 decimal places
                    // - which doesn't play well with setting the css rgba property... so first round the values
                    var roundVals = [ Math.round(value[0]), Math.round(value[1]), Math.round(value[2]) ];
                    window.viz.optionChange('fillStyle', roundVals);
                });

                gen.addColor(options, 'strokeStyle').onChange(function(value) {

                    // Flaw in dat.gui means values can end up to ±10 decimal places
                    // - which doesn't play well with setting the css rgba property... so first round the values
                    var roundVals = [ Math.round(value[0]), Math.round(value[1]), Math.round(value[2]) ];
                    window.viz.optionChange('strokeStyle', roundVals)
                });

                gen.addColor(options, 'canvasFillStyle').onChange(function(value) {

                    // Flaw in dat.gui means values can end up to ±10 decimal places
                    // - which doesn't play well with setting the css rgba property... so first round the values
                    var roundVals = [ Math.round(value[0]), Math.round(value[1]), Math.round(value[2]) ];
                    window.viz.optionChange('canvasFillStyle', roundVals);
                });

                gen.add(options, 'canvasFillAlpha', 0.05, 1).step(0.05).onChange(function(value) {

                    window.viz.optionChange('canvasFillAlpha', value);
                });

                gen.add(options, 'lineWidth').min(0.1).onChange(function(value) {

                    window.viz.optionChange('lineWidth', value);
                });

                gen.add(options, 'linkAlphaToAmplitude').onChange(function(value) {

                    showHideElement('invertAlpha', value);
                    window.viz.optionChange('linkAlphaToAmplitude', value);
                });

                gen.add(options, 'invertAlpha').onChange(function(value) {

                    window.viz.optionChange('invertAlpha', value);
                });

                var ampMult = gen.add(options, 'ampMultiplier').min(0.1).step(0.1).onChange(function(value) {

                    window.viz.optionChange('ampMultiplier', value);
                });
                if(this.vizType === 'rings'){
                    ampMult.max(10).onChange(function(value) {// For some reason have to re-add the listener

                        window.viz.optionChange('ampMultiplier', value);
                    })
                }

                gen.add(options, 'boostAmp').onChange(function(value) {

                    window.viz.optionChange('boostAmp', value);
                    showHideElement('boostAmpDivider', value);
                });

                gen.add(options, 'boostAmpDivider').min(0.1).onChange(function(value) {

                    window.viz.optionChange('boostAmpDivider', value);
                });

                gen.open();

                //-----------------------------------------------------------

                if(this.vizType === 'barloop'){

                    var barLoop = gui.addFolder('BarLoop');

                    barLoop.add(options, 'numElements').min(0).step(1).onChange(function(value){

                        window.viz.optionChange('numElements', value);
                    });

                    barLoop.add(options, 'radius').min(0).step(1).onChange(function(value){

                        window.viz.optionChange('radius', value);
                    });

                    barLoop.add(options, 'counterClockwise').onChange(function(value){

                        window.viz.optionChange('counterClockwise', value);
                    });

                    barLoop.add(options, 'linkWidthToAmplitude').onChange(function(value){

                        showHideElement('lineWidth', !value); // OPP to this value
                        showHideElement('maxLineWidth', value);

                        window.viz.optionChange('linkWidthToAmplitude', value);
                    });


                    barLoop.add(options, 'maxLineWidth', 1, 100).step(1).onChange(function(value){

                        window.viz.optionChange('maxLineWidth', value);
                    });

                    barLoop.open();
                }

                //-------------------------------

                if(this.vizType === 'bars'){

                    var bars = gui.addFolder('Bars');

                    bars.add(options, 'numElements').min(0).onChange(function(value){

                        window.viz.optionChange('numElements', value);
                    });

                    bars.add(options, 'linkWidthToAmplitude').onChange(function(value){

                        showHideElement('lineWidth', !value); // OPP to this value
                        showHideElement('maxLineWidth', value);

                        window.viz.optionChange('linkWidthToAmplitude', value);
                    });

                    bars.add(options, 'maxLineWidth', 1, 200).step(1).onChange(function(value){

                        window.viz.optionChange('maxLineWidth', value);
                    });

                    bars.open()
                }

                //---------------------------------
                if(this.vizType === 'star'){

                    var star = gui.addFolder('Star');

                    star.add(options, 'numElements').min(1).onChange(function(value){

                        window.viz.optionChange('numElements', value);
                    });

                    star.add(options, 'showStarForEachFreq').onChange(function(value) {

                        window.viz.optionChange('showStarForEachFreq', value);
                    });

                    star.add(options, 'linkWidthToAmplitude').onChange(function(value){

                        showHideElement('lineWidth', !value); // OPP to this value
                        showHideElement('maxLineWidth', value);

                        window.viz.optionChange('linkWidthToAmplitude', value);
                    });

                    star.add(options, 'maxLineWidth', 1, 100).step(1).onChange(function(value){

                        window.viz.optionChange('maxLineWidth', value);
                    });

                    star.open();
                }

                //---------------------------

                if(this.vizType === 'circlesandintersects'){

                    var circles, intersects;

                    gen.add(options, 'renderCircles').onChange(function(value) {

                        window.viz.optionChange('renderCircles', value);

                        // Show/hide folder
                        if(value){

                            $jq(circles.domElement).parent().css('display', 'list-item');

                        }else{

                            $jq(circles.domElement).parent().css('display', 'none');
                        }
                    });

                    gen.add(options, 'renderIntersects').onChange(function(value) {

                        window.viz.optionChange('renderIntersects', value);

                        if(value){

                            $jq(intersects.domElement).parent().css('display', 'list-item');

                        }else{

                            $jq(intersects.domElement).parent().css('display', 'none');
                        }
                    });


                    if(this.options.renderCircles){

                        circles = gui.addFolder('Circles');

                        circles.add(options, 'numElements').min(0).onChange(function(value){

                            window.viz.optionChange('numElements', value);
                        });

                        circles.add(options, 'linkWidthToAmplitude').onChange(function(value){

                            showHideElement('lineWidth', !value); // OPP to this value
                            showHideElement('maxLineWidth', value);

                            window.viz.optionChange('linkWidthToAmplitude', value);
                        });

                        circles.add(options, 'maxLineWidth', 1, 200).step(1).onChange(function(value){

                            window.viz.optionChange('maxLineWidth', value);
                        });


                        circles.open();
                    }

                    if(this.options.renderIntersects){

                        intersects = gui.addFolder('Intersects (with circles)');

                        intersects.add(options, 'drawIntersects').onChange(function(value){

                            window.viz.optionChange('drawIntersects', value);

                            showHideElement('intersectRadius', value);
                            showHideElement('doIntersectFill', value);
                            showHideElement('doIntersectStroke', value);
                        });

                        intersects.add(options, 'intersectRadius').min(1).onChange(function(value){

                            window.viz.optionChange('intersectRadius', value);
                        });

                        intersects.add(options, 'doIntersectFill').onChange(function(value){

                            window.viz.optionChange('doIntersectFill', value);

                            // If we're NOT mapping frequency - show option to set circle fill colour
                            if(!that.options.mapFreqToColor){

                                showHideElement('fillStyle', value);
                            }
                        });

                        intersects.add(options, 'doIntersectStroke').onChange(function(value){

                            window.viz.optionChange('doIntersectStroke', value);

                            // If we're NOT mapping frequency - show option to set circle stroke colour
//                            if(!that.options.mapFreqToColor){
//
//                                showHideElement('strokeStyle', value);
//                            }
                        });

                        intersects.add(options, 'drawLines').onChange(function(value){

                            window.viz.optionChange('drawLines', value);

                            // If we're NOT mapping frequency - show option to set line stroke colour
                            if(!that.options.mapFreqToColor){

                                showHideElement('drawLineStyle', value);
                            }
                        });

                        intersects.addColor(options, 'drawLineStyle').onChange(function(value) {

                            // Flaw in dat.gui means values can end up to ±10 decimal places
                            // - which doesn't play well with setting the css rgba property... so first round the values
                            var roundVals = [ Math.round(value[0]), Math.round(value[1]), Math.round(value[2]) ];
                            window.viz.optionChange('drawLineStyle', roundVals)
                        });

                        intersects.add(options, 'intersectLineWidth').min(0.1).onChange(function(value){

                            window.viz.optionChange('intersectLineWidth', value);
                        });

                        intersects.add(options, 'clipLines').onChange(function(value){

                            window.viz.optionChange('clipLines', value);
                        });

                        intersects.open();
                    }

                }

                if(this.vizType === 'rings'){

                    var rings = gui.addFolder('Rings');

                    rings.add(options, 'linkWidthToAmplitude').onChange(function(value){

                        showHideElement('lineWidth', !value); // OPP to this value
                        showHideElement('maxLineWidth', value);

                        window.viz.optionChange('linkWidthToAmplitude', value);
                    });

                    rings.add(options, 'maxLineWidth', 1, 10).step(1).onChange(function(value){

                        window.viz.optionChange('maxLineWidth', value);
                    });

                    rings.open();
                }

                // Start closed
//                gui.closed = true;

                setTimeout(function(){
                    that.hasRendered()
                }, 100);
            };

            /**
             * @description Called from index.html once we know the visualisation type
             *              Set config vars based on the viz type
             *              Hide/show gui elements (base on vizType or initial config settings)
             *
             * @param pVizType
             */
            that.setUp = function(pVizType, pVizOptions){

                this.vizType = pVizType.toLowerCase();

                if(this.vizType === 'barloop'){

                    this.options.ampMultiplier = 0.5;
                    this.options.lineWidth = 3;
                    this.options.linkAlphaToAmplitude = true;
                    this.options.invertAlpha = true;

                    __hideArray.push('spacing')
                    __hideArray.push('fillStyle')
                }

                if(this.vizType === 'bars'){

                    this.options.numElements = 0;// will decide number based on width/spacing

                    this.options.brightColors = false;

                    this.options.linkAlphaToAmplitude = true;
                    this.options.invertAlpha = true;

                    this.options.linkWidthToAmplitude = true;

                    __hideArray.push('fillStyle')
                    __hideArray.push('lineWidth');
                }

                if(this.vizType === 'star'){

                    this.options.numElements = 30;

                    this.options.linkAlphaToAmplitude = true;
                    this.options.invertAlpha = true;

                    this.options.linkWidthToAmplitude = true;

                    __hideArray.push('spacing')
                    __hideArray.push('fillStyle')
                    __hideArray.push('lineWidth');
                }

                if(this.vizType === 'circlesandintersects'){

                    this.options.numElements = 0;// will decide number based on width/spacing
                    this.options.canvasFillAlpha = 0.1;
                    this.options.ampMultiplier = 0.5;
                    this.options.boostAmpDivider = 35;
                    this.options.linkAlphaToAmplitude = false;
                    this.options.invertAlpha = false;

                    __hideArray.push('brightColors');
                    __hideArray.push('drawLineStyle');
                    __hideArray.push('maxLineWidth');
                }


                if(this.vizType === 'rings'){

                    this.options.boostAmpDivider = 5;
                    this.options.canvasFillAlpha = 0.3;
                    this.options.brightColors = false;
                    this.options.linkWidthToAmplitude = true;
                    this.options.maxLineWidth = 10;


                    __hideArray.push('spacing');
                    __hideArray.push('startPosX');
                    __hideArray.push('lineWidth');
                    __hideArray.push('boostAmp');
                }


                if(!that.options.boostAmp){

                    __hideArray.push('boostAmpDivider')
                }

                if(!that.options.mapFreqToColor){

                    __hideArray.push('brightColors');

                }else{

                    __hideArray.push('fillStyle');
                    __hideArray.push('strokeStyle');
                }

                if(!that.options.linkAlphaToAmplitude){

                    __hideArray.push('invertAlpha')
                }

                // ################# INIT #################
                this.init();

                setTimeout(function(){

                    document.getElementById('options').style.display = 'block';
                }, 250);
            };

            that.hasRendered = function(){

                _.each(__hideArray, function(pItem){

                    showHideElement(pItem, false);
                });
            };

            var showHideElement = function(pId, pShow){

                var el;
                $jq('.property-name').each(function(){

                    var text = $jq(this).text();
                    if(text === pId){

                        el = $jq(this);
                    }
                });

                if(el){

                    if(pShow === false){

                        el.closest('li').css('display', 'none');
                    }else{
                        el.closest('li').css('display', 'block');
                    }
                }

            };

            return that;
        }

        return options;
    });