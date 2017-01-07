(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        reset to original configuration
     ******************************************************************/
    function action() {
        VIZ.target();
        if (typeof(VIZ.reset) ==='function') VIZ.reset();
        VIZ.ResetCTRL.deactivate();
    }

    function render() {
        d3.select('#Reset').append('circle')
            .attr('r', 6)
            .attr('transform','translate(7,7)');

        d3.select('#Reset').append('path')
            .attr('d','M0 0 L14 14')
            .style('stroke','white')
            .style('stroke-width', 4);

        d3.select('#Reset').append('path')
            .attr('d','M2 1 L7 5 L7 -3 Z')
            .style('fill','gray')
            .style('stroke-width', 0);

        d3.select('#Reset').append('path')
            .attr('d','M12 13 L7 17 L7 9 Z')
            .style('fill','gray')
            .style('stroke-width',0);
    }

    function check() {
        return (VIZ.static || (VIZ.dynamic && !VIZ.meta.refresh));
    }

    VIZ.ResetCTRL = new VIZ.Control('Reset','Reset to original',
                            false,   //no screen
                            action,
                            null,    //default mouse-over
                            null,    //default mouse-out
                            render,
                            check);

    window.VIZ = VIZ;
})(window);
