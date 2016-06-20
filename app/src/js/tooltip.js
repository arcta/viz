(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        svg tooltip
     ******************************************************************/

    VIZ.tooltip = function() {
        var W = window.innerWidth,
            H = window.innerHeight,
            timer,
            tooltip = VIZ.canvas.append('g')
                        .attr('class','tooltip');

        tooltip.append('path')
            .attr('d','M-8 0 L8 0 L0 8 Z');

        tooltip.append('rect')
            .attr('rx', 5);

        tooltip.selectAll('text')
            .data(d3.range(10)).enter()
                .append('text');


        function show(text, coords, pointer) {
            clearTimeout(timer);

            var lines = text.split('\n'),
                span = VIZ.textsize(lines,'label'),
                w = span +24 || 100,
                l = lines.length +1,
                x = coords[0] > w/2 ? -w/2 : -coords[0],
                X = coords[0], Y;

            tooltip.attr('width', w);

            if (X + w/2 > W -24) x = W-X-w -24;

            tooltip.select('rect')
                .attr('transform','translate('+ [x +12, -16*l] +')')
                .attr('width', w)
                .attr('height', 16*l);

            tooltip.selectAll('text')
                .attr('transform', function(d){ return 'translate('+ [x +22, 20+ 16*(d-l)] +')'; })
                .text(function(d){ return d < lines.length ? lines[d] : ''; });

            if (coords[1] > 16*l + VIZ.margin.top) {
                tooltip.select('path')
                    .attr('transform','translate('+ [12, -1] +')')
                    .style('display', pointer ? 'block':'none');

                Y = coords[1] -12;

            } else {
                tooltip.select('path')
                    .attr('transform','translate('+ [12, 1-16*l] +') rotate(180)')
                    .style('display', pointer ? 'block':'none');

                Y = coords[1] +16*l +12;
            }

            tooltip
                .style('display','block')
            .transition()
            .duration(100)
                .attr('transform','translate('+ [X,Y] +')')
                .style('opacity', 1);
        }

        function hide() {
            tooltip
                .transition()
                .duration(500)
                    .style('opacity', 0)
                .each('end',
                    function() {
                        tooltip.style('display','none');
                    });
        }

        VIZ.info = { show: show, hide: hide };
    };

    window.VIZ = VIZ;
})(window);
