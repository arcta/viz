(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        default colors
     ******************************************************************/

    VIZ.color = function(d,i) {
        if (!VIZ.meta['z'])
            return VIZ.meta['color'] ? VIZ.meta['color'] : '#2B547E';

        if ('categorical' === VIZ.meta['summary']['z']['type']
            && 'colormap' in VIZ.meta && d in VIZ.meta['colormap'])
            return VIZ.meta['colormap'][d];

        if ('categorical' === VIZ.meta['summary']['z']['type']
            && 'colormap' in VIZ.meta)
            return VIZ.meta['colormap'][i] || 'gray';

        var D = VIZ.meta['summary']['z']['domain'],
            bluish, redish, gradient, f;

        if ('categorical' === VIZ.meta['summary']['z']['type']) {
            bluish = d3.scale.linear().range(['#0bb080','#551188']);
            redish = d3.scale.linear().range(['#b0220b','#eecc00']);
            f = i/D.length;
            return f > 0.5 ? redish(2*f -1) : bluish(2*f);
        }

        if ('colormap' in VIZ.meta)
            gradient = d3.scale.linear().range(VIZ.meta['colormap']);
        else
            gradient = d3.scale.linear().range(['#551188','#b0220b']);

        f = (d-D[0])/(D[1]-D[0]);
        return gradient(f);
    };

    window.VIZ = VIZ;
})(window);
