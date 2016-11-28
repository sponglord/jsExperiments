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
            that.options.inColor = true;
            that.options.brightColors = true;

            that.options.canvasFillStyle = [ 0, 0, 0];
            that.options.canvasFillAlpha = 0.25;

            that.options.logAmpDivider = 5;
            that.options.numBars = 180;
            that.options.radius = 200;
            that.options.counterClockwise = false;

            that.init = function(){

                var options = this.options;

                var gui = new dat.GUI({ autoPlace: false, hideable:true });
                var customContainer = document.getElementById('options');
                customContainer.appendChild(gui.domElement);

                var gen = gui.addFolder('General');
                var barLoop = gui.addFolder('BarLoop');


                gen.add(options, 'inColor').onChange(function(value) {

                    var bc;
                    $jq('.property-name').each(function(){

                        var text = $jq(this).text();
                        if(text === 'brightColors'){

                            bc = $jq(this);
                        }
                    });

                    if(value === false){

                        bc.closest('li').css('display', 'none');
                    }else{
                        bc.closest('li').css('display', 'block');
                    }

                    window.viz.optionChange('inColor', value)
                });

                gen.add(options, 'brightColors').onChange(function(value) {

                    window.viz.optionChange('brightColors', value)
                });

                gen.addColor(options, 'canvasFillStyle').onChange(function(value) {

                    window.viz.optionChange('canvasFillStyle', value)
                });

                gen.add(options, 'canvasFillAlpha', 0.05, 1).step(0.05).onChange(function(value) {

                    window.viz.optionChange('canvasFillAlpha', value)
                });

                gen.add(options, 'logAmpDivider').onChange(function(value) {

                    window.viz.optionChange('logAmpDivider', value)
                });

                gen.open();

                //-----------------------------------------------------------

                barLoop.add(options, 'numBars').onChange(function(value) {

                    window.viz.optionChange('numBars', value)
                });

                barLoop.add(options, 'radius').onChange(function(value) {

                    window.viz.optionChange('radius', value)
                });

                barLoop.add(options, 'counterClockwise').onChange(function(value) {

                    window.viz.optionChange('counterClockwise', value)
                });

//                col.onFinishChange(function(value) {
//                });

            };

            return that;
        }

        return options;
    });