/* global require */
require.config({

    //By default load any module IDs from js dir
    baseUrl: '../js',

    // Except...
    // NOTE: paths config is relative to the baseUrl, and
    // never includes a ".js" extension since
    // the paths config could be for a directory.
    paths: {
        lodash: 'lib/lodash/lodash.4.10.0',
        jquery: 'lib/jquery-3.1.1.min',
        datgui : '../js/lib/datgui/dat.gui',
        avBase : 'analyser/baseCode_mic'
    }
});

require(['analyser/drawOptions'],
    function(DrawOptions){
        // dependencies are loaded and can be used here now.

        var opts = new DrawOptions();

        window.drawOptions = opts;
    });



// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel
// using 'self' instead of 'window' for compatibility with both NodeJS and IE10.
(function(){

    var lastTime = 0;
    var vendors = [ 'ms', 'moz', 'webkit', 'o' ];

    for ( var x = 0; x < vendors.length && !self.requestAnimationFrame; ++ x ) {

        self.requestAnimationFrame = self[ vendors[ x ] + 'RequestAnimationFrame' ];
        self.cancelAnimationFrame = self[ vendors[ x ] + 'CancelAnimationFrame' ] || self[ vendors[ x ] + 'CancelRequestAnimationFrame' ];

    }

    if ( self.requestAnimationFrame === undefined && self['setTimeout'] !== undefined ) {

        self.requestAnimationFrame = function ( callback ) {

            var currTime = Date.now(), timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
            var id = self.setTimeout( function() { callback( currTime + timeToCall ); }, timeToCall );
            lastTime = currTime + timeToCall;
            return id;

        };

    }

    if( self.cancelAnimationFrame === undefined && self['clearTimeout'] !== undefined ) {

        self.cancelAnimationFrame = function ( id ) { self.clearTimeout( id ) };
    }

})();

window.AudioContext = (function(){
    return  window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
})();


window.navigator.getUserMedia = (function(){
    return  navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
})()
