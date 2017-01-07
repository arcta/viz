(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        default colors
     ******************************************************************/

    VIZ.color = function(d,i) {
        if (!VIZ.meta['z'])
            return VIZ.meta['color'] ? VIZ.meta['color'] : '#2B547E';

        if ('categoric' === VIZ.meta['summary']['z']['type']
            && 'colormap' in VIZ.meta && VIZ.meta['colormap'][d])
            return VIZ.meta['colormap'][d];

        var D = VIZ.conf.zdomain,
            bluish, redish, gradient, f;

        if ('categoric' === VIZ.meta['summary']['z']['type']) {
            bluish = d3.scaleLinear().range(['#0bb080','#551188']);
            redish = d3.scaleLinear().range(['#b0220b','#eecc00']);
            f = i/D.length;
            return f > 0.5 ? redish(2*f -1) : bluish(2*f);
        }

        if ('colormap' in VIZ.meta)
            gradient = d3.scaleLinear().range(VIZ.meta['colormap']);
        else
            gradient = d3.scaleLinear().range(['#551188','#b0220b']);

        f = (d-D[0])/(D[1]-D[0]);
        return gradient(f);
    };


    window.VIZ = VIZ;
})(window);
