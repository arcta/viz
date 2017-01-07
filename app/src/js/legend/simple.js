(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        categoric parameter on the legend: simple list
     ******************************************************************/
    VIZ.simpleLegend = function(legend, color, select, deselect, labels) {
        color = color || function(z,i){ return 'gray'; };
        select = select || function(z,i){};
        deselect = deselect || function(){};
        labels = labels || function(z){ return VIZ.format('zformat')(z); };

        var Z = VIZ.conf['zdomain'], N = Z.length;

        VIZ.conf['selected'] = VIZ.conf['selected'] ||
                Z.map(function(d){ return 1; });

        VIZ.select = function(d,i) {
            if (d3.sum(VIZ.conf['selected']) === VIZ.conf['selected'].length)
                VIZ.conf['selected'] = VIZ.conf['zdomain']
                    .map(function(z,j){ return j === i ? 1 : 0; });
            else VIZ.conf['selected'][i] = VIZ.conf['selected'][i] ? 0 : 1;

            legend.selectAll('.legend')
                .style('opacity',
                    function(z,j) {
                        return VIZ.conf['selected'][j] ? 1 : 0.3;
                    });

            select(i);
            if (!d3.max(VIZ.conf['selected']) || d3.min(VIZ.conf['selected'])) {
                VIZ.deselect();
                deselect();
            }
        };

        VIZ.deselect = function() {
            VIZ.conf['selected'] = VIZ.conf['zdomain']
                .map(function(d){ return 1; });

            legend.selectAll('.legend')
                .style('opacity', 1);
        };

        legend.attr('transform','translate('+ [VIZ.width +15, 100] +')');

        legend.selectAll('.legend')
            .data(Z).enter()
                .append('g')
                    .attr('class','legend')
                    .attr('transform',
                        function(z,i) {
                            return 'translate('+ [0,10+20*(i+0.5)] +')';
                        })
                    .on(_IN,
                        function(z,i) {
                            VIZ.info.show(labels(z),[
                                VIZ.margin.left + VIZ.width +15,
                                VIZ.margin.top +105+20*(i+0.5)], true);
                        })
                    .on(_OUT, function(){ VIZ.info.hide(); })
                    .on(_CLICK, VIZ.select)
                    .style('opacity', 1);

        legend.select('.axis-label')
            .style('display','none');

        legend.selectAll('.legend')
            .append('text')
                .attr('class','label')
                .attr('transform','translate(20,0)')
                .attr('dy','-.15em')
                .text(labels);

        legend.reset = function() {
            legend.selectAll('.legend')
                .style('opacity',
                    function(z,i) {
                        return VIZ.conf['selected'][i] ? 1 : 0.3;
                    });

            VIZ.conf['selected'].map(select);
        };

        return legend;
    };


    window.VIZ = VIZ;
})(window);
