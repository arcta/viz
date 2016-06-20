(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    VIZ.scatter = function() {
        var r = VIZ.meta['r'] || 5;

        VIZ.switch = VIZ.meta['switch'] || 50;
        if (VIZ.stream) VIZ.switch = 0;

        VIZ.conf['plot'] = VIZ.conf['plot'] || [1,1];
        VIZ.conf['translate'] = VIZ.conf['translate'] || [0,0];
        VIZ.conf['scale'] = VIZ.conf['scale'] || 1;
        VIZ.conf['selected'] = VIZ.conf['selected'] || null;

        /**************************************************************
            VIZ shoud know if it was modified
         **************************************************************/
        var translate = VIZ.conf['translate'],
            scale = VIZ.conf['scale'],
            selected = VIZ.conf['selected'] ? VIZ.conf['selected'].slice() : [];

        VIZ.modified = function() {
            if (VIZ.conf['scale'] !== scale )
                return true;

            if (!VIZ.selected)
                return false;

            if (d3.max(VIZ.selected) === 0)
                return false;

            if (d3.min(VIZ.selected) === -1)
                return false;

            for (var i = 0; i < VIZ.selected.length; ++i)
                if (!selected[i] || VIZ.selected[i] !== selected[i])
                    return true;

            for (var i = 0; i < translate.length; ++i)
                if (VIZ.conf['translate'][i] !== translate[i])
                    return true;

            return false;
        };

        /**************************************************************
            common build
         **************************************************************/
        var plot = VIZ.plot();

        translate[0] *= VIZ.width/VIZ.conf['plot'][0];
        translate[1] *= VIZ.height/VIZ.conf['plot'][1];

        /**************************************************************
            local functionality
         **************************************************************/
        function conf() {
            if (d3.event) {
                VIZ.conf['translate'] = d3.event.translate || VIZ.conf['translate'];
                VIZ.conf['scale'] = d3.event.scale || VIZ.conf['scale'];
            }

            var xdomain = VIZ.x.domain(), ydomain = VIZ.y.domain();

            if ('date' === VIZ.meta['summary']['x']['type'])
                xdomain = [ xdomain[0].getTime()/1000, xdomain[1].getTime()/1000 ];

            if ('date' === VIZ.meta['summary']['y']['type'])
                ydomain = [ ydomain[0].getTime()/1000, ydomain[1].getTime()/1000 ];

            VIZ.conf['xdomain'] = xdomain;
            VIZ.conf['ydomain'] = ydomain;
            VIZ.conf['selected'] = VIZ.selected;
            VIZ.conf['plot'] = [ VIZ.width, VIZ.height ];
        }

        function color(d,i) {
            return VIZ.color(d,i);
        }

        function select(d,i) {
            d3.select('#plot').selectAll('.point')
                .attr('fill-opacity',
                    function(D,I) {
                        if (VIZ.meta['summary']['z']['range']) {
                            var Z = VIZ.meta['summary']['z']['domain'],
                                N = VIZ.selected[1],
                                b = D.z === Z[1] ? N-1 : parseInt(Math.floor(N*(D.z - Z[0])/(Z[1] - Z[0])), 10);
                            return b === i ? 0.5 : 0;
                        }
                        return VIZ.selected[VIZ.meta['summary']['z']['domain'].indexOf(D.z)] ? 0.5 : 0;
                    });
        }

        function deselect(d,i) {
            d3.select('#plot').selectAll('.point')
                .attr('fill-opacity', 0.5);
        }

        function info(d) {
            var ok, text, X, Y, dX, dY;

            if (!VIZ.meta['z']) {
                ok = true;

            } else if (VIZ.meta['summary']['z']['range']) {
                var Z = VIZ.meta['summary']['z']['domain'],
                    N = VIZ.selected[1],
                    b = d.z === Z[1] ? N-1 : parseInt(Math.floor(N*(d.z - Z[0])/(Z[1] - Z[0])), 10);
                ok = !VIZ.selected || VIZ.selected[0] === -1 || b === VIZ.selected[0];

            } else {
                var i = VIZ.meta['summary']['z']['domain'].indexOf(d.z);
                ok = !VIZ.selected || !d3.max(VIZ.selected) || VIZ.selected[i];
            }

            ok = ok && VIZ.x(d.x) * VIZ.conf.scale >= 0
                    && (VIZ.x(d.x) - VIZ.width) * VIZ.conf.scale <= 0
                    && (VIZ.y(d.y) - VIZ.height) * VIZ.conf.scale <= 0
                    && VIZ.y(d.y) * VIZ.conf.scale >= 0

            if (!ok) return;

            text = (VIZ.meta['xlabel'] || VIZ.meta['x']) +': '+ VIZ.format('xformat')(d.x) +'\n'+
                   (VIZ.meta['ylabel'] || VIZ.meta['y']) +': '+ VIZ.format('yformat')(d.y) +
                ('z' in VIZ.meta ? '\n'+ (VIZ.meta['zlabel'] || VIZ.meta['z']) +': '+ VIZ.format('zformat')(d.z) : '');

            X = VIZ.margin.left + VIZ.x(d.x);
            Y = VIZ.margin.top + VIZ.y(d.y);

            dX = 'categorical' === VIZ.meta['summary']['x']['type'] ?
                                    VIZ.x.rangeBand()/2 : 0;

            dY = 'categorical' === VIZ.meta['summary']['y']['type'] ?
                                    VIZ.y.rangeBand()/2 : 0;

            VIZ.info.show(text, [X + dX -12, Y + dY], true);

            d3.select('#dot')
                .attr('fill', color(d.z,i))
                .attr('transform','translate('+ [VIZ.x(d.x) + dX, VIZ.y(d.y) + dY] +')')
                .style('display','block');
        }

        function transition() {
            var update = plot.selectAll('.point').data(VIZ.data),
                Z = 'z' in VIZ.meta ? VIZ.meta['summary']['z']['domain'] || VIZ.zdomain : [];

            update.enter()
                .append('circle')
                    .attr('class','point');

            update.exit()
                .remove();

            update
                .attr('r', r)
                .attr('fill',
                    function(d) {
                        if (!VIZ.meta['z'])
                            return color();
                        return color(d.z, Z.indexOf(d.z));
                    })
                .attr('fill-opacity',
                    function(d,i) {
                        if (!VIZ.meta['z']) return 0.5;
                        if (VIZ.meta['summary']['z']['range']) {
                            if (-1 === VIZ.selected[0]) return 0.5;
                            var N = VIZ.selected[1],
                                b = d.z === Z[1] ? N-1 : parseInt(Math.floor(N*(d.z - Z[0])/(Z[1] - Z[0])), 10);
                            return b === VIZ.selected[0] ? 0.5 : 0;
                        }
                        if (!d3.sum(VIZ.selected)) return 0.5;
                        return 0.5 * VIZ.selected[Z.indexOf(d.z)];
                    });

            if (legend && !VIZ.static)
                legend.transition();

            function coords(d) {
                var X, Y;
                X = 'categorical' === VIZ.meta['summary']['x']['type'] ?
                        VIZ.x(d.x) + VIZ.x.rangeBand()/2 : VIZ.x(d.x);
                Y = 'categorical' === VIZ.meta['summary']['y']['type'] ?
                        VIZ.y(d.y) + VIZ.y.rangeBand()/2 : VIZ.y(d.y);
                return 'translate(' + [X,Y] + ')';
            }

            update
                .attr('r',
                    function(d) {
                        var s = VIZ.conf['scale'];
                        return  VIZ.x(d.x)*s >= 0
                            && (VIZ.x(d.x) - VIZ.width)*s <= 0
                            && (VIZ.y(d.y) - VIZ.height)*s <= 0
                            && VIZ.y(d.y)*s >= 0
                                ? r/s : 0;
                    })
                .attr('transform', coords);

            if (xbox || ybox) {
                xQ = VIZ.meta['summary']['x']['quartiles'];
                yQ = VIZ.meta['summary']['y']['quartiles'];
            }

            if (VIZ.image) {
                if (xbox)
                    plot.select('.xbox')
                        .attr('transform','translate('+ [VIZ.x(xQ[0]),0] +')')
                        .attr('width', VIZ.x(xQ[2])-VIZ.x(xQ[0]));

                if (ybox)
                    plot.select('.ybox')
                        .attr('transform','translate('+ [0,VIZ.y(yQ[2])] +')')
                        .attr('height', VIZ.y(yQ[0])-VIZ.y(yQ[2]));
                return;
            }

            if (xbox)
                plot.select('.xbox')
                    .transition()
                    .duration(250)
                        .attr('transform','translate('+ [VIZ.x(xQ[0]),0] +')')
                        .attr('width', VIZ.x(xQ[2])-VIZ.x(xQ[0]));

            if (ybox)
                plot.select('.ybox')
                    .transition()
                    .duration(250)
                        .attr('transform','translate('+ [0,VIZ.y(yQ[2])] +')')
                        .attr('height', VIZ.y(yQ[0])-VIZ.y(yQ[2]));


            var overlay = plot.select('.tooltip-overlay')
                                .selectAll('path')
                                    .data(voronoi(VIZ.data));

            overlay.enter()
                .append('path');

            overlay.exit()
                .remove();

            overlay
                .attr('d', function(d,i){ return d ? 'M'+ d.join('L') +'Z' : ''; })
                .datum(function(d,i){ return d ? d.point : null; })
                .on(_IN, info);
        }

        function zoom() {
            var s = d3.event ? d3.event.scale : scale,
                t = d3.event ? d3.event.translate : translate;

            VIZ.callAxes();
            plot.attr('transform','translate(' + t +')'+
                                  'scale(' + s + ')');

            plot.selectAll('.point')
                .attr('r',
                    function(d) {
                        return r/s;
                    })
                .style('display',
                    function(d) {
                        return  VIZ.x(d.x) * s >= 0
                            && (VIZ.x(d.x) - VIZ.width) * s <= 0
                            && (VIZ.y(d.y) - VIZ.height) * s <= 0
                            && VIZ.y(d.y) * s >= 0
                                    ? 'block':'none';
                    });

            VIZ.canvas.select('#dot')
                .style('display','none');

            conf();
        }

        VIZ.zoom = d3.behavior.zoom()
            .x(VIZ.x)
            .y(VIZ.y)
            .scaleExtent([Math.min(1,VIZ.conf['scale']),Infinity])
            .on('zoom', zoom);

        d3.select('#plot').append('circle')
            .attr('id','dot')
            .attr('r', 2*r)
            .style('opacity', 0.3)
            .style('display','none');

        /**************************************************************
            init with empty data
         **************************************************************/
        var xQ = VIZ.meta['summary']['x']['quartiles'] || false,
            yQ = VIZ.meta['summary']['y']['quartiles'] || false,
            xbox = VIZ.meta['xbox'] && xQ,
            ybox = VIZ.meta['ybox'] && yQ,
            xmean = xbox ? VIZ.x(xQ[1]) : null,
            ymean = ybox ? VIZ.y(yQ[1]) : null;

        if (xbox)
            plot.append('rect')
                .attr('class','xbox')
                .attr('width', 0)
                .attr('height', VIZ.height)
                .attr('transform','translate('+ [xmean, 0] +')');

        if (ybox)
            plot.append('rect')
                .attr('class','ybox')
                .attr('height', 0)
                .attr('width', VIZ.width)
                .attr('transform','translate('+ [0, ymean] +')');

        if (xbox)
            plot.append('path')
                .attr('class','xmean')
                .attr('d','M0 0 L0 '+ VIZ.height)
                .attr('transform','translate('+ [xmean, 0] +')');

        if (ybox)
            plot.append('path')
                .attr('class','ymean')
                .attr('d','M0 0 L'+ VIZ.width +' 0')
                .attr('transform','translate('+ [0, ymean] +')');

        plot.selectAll('.point')
            .data([]).enter()
                .append('circle')
                    .attr('class','point')
                    .attr('fill-opacity', 0.5);

        VIZ.buildAxes();

        VIZ.xAxis
            .ticks(4)
            .tickSize(-VIZ.height -20)
            .outerTickSize(4);

        if ('date' === VIZ.meta['summary']['x']['type'])
            VIZ.xAxis.ticks(5);

        VIZ.yAxis
            .ticks(4)
            .tickSize(-VIZ.width -20)
            .outerTickSize(4);

        VIZ.callAxes();

        if (!VIZ.image) {
        /**************************************************************
            tooltip overlay
         **************************************************************/
            var voronoi = d3.geom.voronoi()
                .x(function(d){ return VIZ.x(d.x); })
                .y(function(d){ return VIZ.y(d.y); })
                .clipExtent([[0,0],[VIZ.width, VIZ.height]]);

            plot.append('g')
                .attr('class','tooltip-overlay');

            plot.select('.tooltip-overlay').selectAll('path')
                .data([]).enter()
                    .append('path');

            plot.select('.tooltip-overlay')
                .on(_OUT,
                    function(d) {
                        VIZ.info.hide();
                        d3.select('#dot')
                            .style('display','none');
                    });
        }

        if ('z' in VIZ.meta) {
        /**************************************************************
            set legend
         **************************************************************/
            var legend = VIZ.legend();

            if (VIZ.meta['summary']['z']['range'])
                legend = VIZ.legendHist(legend, color, select, deselect);
            else
                legend = VIZ.legendPie(legend, color, select, deselect);

            legend.selectAll('.legend')
                .append('circle')
                    .attr('transform', function(d,i){ return 'translate(6,-6)'; })
                    .attr('r', 6)
                    .attr('fill', color)
                    .attr('fill-opacity', 0.5);
        }

        /**************************************************************
            get actual data in
         **************************************************************/
        transition();
        VIZ.transition(transition);

        /**************************************************************
            resolve bookmark if any
         **************************************************************/
        if (VIZ.bookmark)
            VIZ.set(zoom);

        /**************************************************************
            enable common utilities
         **************************************************************/
        VIZ.utils(conf);
        VIZ.tooltip();
        VIZ.done();
    }

    window.VIZ = VIZ;
})(window);
