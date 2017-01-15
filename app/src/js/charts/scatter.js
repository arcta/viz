(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    VIZ.scatter = function() {
        /**************************************************************
            configuration
         **************************************************************/
        VIZ.conf['toolbox'] = VIZ.published ?
                    ['Reset','Select','Insight']:
                    ['Reset','Select','Marker','Insight'];

        VIZ.defaults['r'] = VIZ.meta['r'] || 5;
        VIZ.defaults['zbins'] = VIZ.meta['zbins'] || 10;

        VIZ.defaults['scale'] = 1;
        VIZ.defaults['translate'] = [0,0];

        ['x','y'].map(function(a) {
            VIZ.defaults[a +'log'] = VIZ.meta[a +'log'] || false;
            if (VIZ.defaults[a +'log'] === true ||
                VIZ.defaults[a +'log'] === 'e') VIZ.defaults[a +'log'] = Math.E;
        });

        VIZ.domains();

        if (!Array.isArray(VIZ.defaults['zdomain'])) {
            VIZ.defaults['zdomain'] = [''];
            VIZ.meta.summary.z = { type:'categoric', hist:[VIZ.data.length] };
        }

        if (VIZ.meta.summary.z.type === 'categoric')
            VIZ.defaults['selected'] = VIZ.defaults['zdomain']
                                    .map(function(z){ return 1; });
        else
            VIZ.defaults['selected'] = d3.range(VIZ.defaults['zbins'])
                                    .map(function(z){ return 1; });

        VIZ.configure();

        /**************************************************************
            common functionality
         **************************************************************/
        var plot = VIZ.init();

        /**************************************************************
            local functionality
         **************************************************************/
        function color(d,i) {
            return VIZ.color(d,i);
        }

        function select(i) {
            overlay();
            d3.select('#points').selectAll('.point')
                .attr('fill-opacity',
                    function(d) {
                        if (VIZ.meta.summary.z.type === 'categoric')
                            return VIZ.conf['selected'][Z.indexOf(d.z)] ? 0.5 : 0;
                        return VIZ.conf['selected'][bin(d.z)] ? 0.5 : 0;
                    });
        }

        function deselect() {
            overlay();
            d3.select('#points').selectAll('.point')
                .attr('fill-opacity', 0.5);
        }

        function index(d) {
            return VIZ.meta.summary.z.type === 'categoric' ?
                        Z.indexOf(d.z) : bin(d.z);
        }

        function retain(d) {
            if (VIZ.stream)
                return true;

            return VIZ.x(d.x) * VIZ.conf.scale >= 0
                && (VIZ.x(d.x) - VIZ.width) * VIZ.conf.scale <= 0
                && (VIZ.y(d.y) - VIZ.height) * VIZ.conf.scale <= 0
                && VIZ.y(d.y) * VIZ.conf.scale >= 0
        }

        function info(d) {
            var X, Y,
                text = (VIZ.meta['xlabel'] || VIZ.meta['x']) +': '+ VIZ.format('xformat')(d.x) +'\n'+
                   (VIZ.meta['ylabel'] || VIZ.meta['y']) +': '+ VIZ.format('yformat')(d.y) +
                ('z' in VIZ.meta ? '\n'+ (VIZ.meta['zlabel'] || VIZ.meta['z']) +': '+ VIZ.format('zformat')(d.z) : '');

            X = VIZ.margin.left + VIZ.x(d.x);
            Y = VIZ.margin.top + VIZ.y(d.y);

            VIZ.info.show(text, [X -12, Y], true);

            d3.select('#dot')
                .attr('fill', color(d.z,index(d)))
                .attr('transform','translate('+ [VIZ.x(d.x), VIZ.y(d.y)] +')')
                .style('display','block');
        }

        function drag() {
            var x = Math.max(0, Math.min(d3.event.x, VIZ.width)),
                y = Math.max(0, Math.min(d3.event.y, VIZ.height)),
                A, B;

            VIZ.SelectCTRL.start = VIZ.SelectCTRL.start || [x,y];
            VIZ.SelectCTRL.stop = [x,y];

            if (VIZ.meta.summary.x.type === 'categoric') {
                VIZ.SelectCTRL.start[0] = 0;
                VIZ.SelectCTRL.stop[0] = VIZ.width;
            }

            if (VIZ.meta.summary.y.type === 'categoric') {
                VIZ.SelectCTRL.start[1] = 0;
                VIZ.SelectCTRL.stop[1] = VIZ.height;
            }

            A = VIZ.SelectCTRL.start,
            B = VIZ.SelectCTRL.stop;

            d3.select('#SelectScreen').select('path')
                .attr('d', 'M'+ A[0] +' '+ A[1] +
                          ' L'+ A[0] +' '+ B[1] +
                          ' L'+ B[0] +' '+ B[1] +
                          ' L'+ B[0] +' '+ A[1] +' Z');
        }

        VIZ.drag = d3.drag()
            .on('drag', drag);

        function bin(z) {
            var N = VIZ.conf['zbins'], Z = VIZ.conf['zdomain'];
            return Math.min(N-1, parseInt(Math.floor(N*(z - Z[0])/(Z[1] - Z[0])), 10));
        }

        function opacity(d) {
            if (!VIZ.meta['z']) return 0.5;
            return 0.5 * VIZ.conf['selected'][index(d)];
        }

        function size(d) {
            return retain(d) ? r/VIZ.conf.scale : 0;
        }

        function translate(d) {
            return 'translate('+ [VIZ.x(d.x), VIZ.y(d.y)] +')';
        }

        function overlay() {
            var voronoi = d3.voronoi()
                .x(function(d){ return VIZ.x(d.x); })
                .y(function(d){ return VIZ.y(d.y); })
                .extent([[-5,-5],[VIZ.width +5, VIZ.height +5]]);

            var data = [];
            VIZ.data.map(function(d) {
                if (retain(d) && (!VIZ.meta.z || VIZ.conf.selected[index(d)]))
                    data.push(d);
            });

            plot.select('.tooltip-overlay')
                .remove();

            plot.append('g')
                .attr('class','tooltip-overlay')
                .on(_OUT,
                    function(d) {
                        VIZ.info.hide();
                        d3.select('#dot')
                            .style('display','none');
                    })
                .selectAll('path')
                .data(voronoi.polygons(data)).enter()
                    .append('path')
                        .attr('d', function(d,i){ return d ? 'M'+ d.join('L') +'Z' : ''; })
                        .datum(function(d,i){ return d ? d.data : null; })
                        .on(_IN, info);
        }

        /**************************************************************
            run configuration
         **************************************************************/
        function reset() {
            VIZ.viewport(VIZ.conf['transition']);

            plot.select('#points')
                .selectAll('.point')
                    .attr('fill',
                        function(d) {
                            if (!VIZ.meta['z']) return color();
                            return color(d.z, index(d));
                        })
                    .attr('fill-opacity', opacity)
                    .attr('r', size);

            if (VIZ.image)
                plot.select('#points')
                    .selectAll('.point')
                        .attr('transform', translate);
            else
                plot.select('#points')
                    .selectAll('.point')
                    .transition().duration(VIZ.conf['transition'])
                        .attr('transform', translate);

            hist = (VIZ.meta.summary.z.type === 'categoric' ?
                    VIZ.conf['zdomain'] : d3.range(VIZ.conf['zbins']))
                        .map(function(z){ return 0; });

            VIZ.data.map(function(d) {
                if (retain(d)) hist[index(d)] += 1;
            });

            if (!VIZ.image) overlay();

            if (legend) {
                VIZ.meta.summary.z.hist = hist;
                legend.transition();
            }
        }

        /**************************************************************
            data transition if data changed
         **************************************************************/
        function transition() {
            var points = plot.select('#points')
                            .selectAll('.point')
                                .data(VIZ.data);
            points.enter()
                .append('circle')
                    .classed('point', true)
                //.merge(areas) //???
                    .attr('fill',
                        function(d) {
                            if (!VIZ.meta['z']) return color();
                            return color(d.z, index(d));
                        })
                    .attr('fill-opacity', opacity)
                    .attr('transform', translate)
                    .attr('r', size);

            points.exit()
                .remove();

            if (!VIZ.static && 'date' === VIZ.meta.summary.x.type) {
                var t = (new Date()).getTime(),
                    t0 = t - (VIZ.meta['window'] || VIZ.conf['window']);
                VIZ.conf.xdomain = [t0, t];
            }

            plot.select('#points')
                .selectAll('.point')
                    .attr('transform', translate);

            reset();
        }

        /**************************************************************
            initialize with empty data
         **************************************************************/
        var Z = VIZ.conf.zdomain, N = VIZ.defaults['zbins'],
            hist = VIZ.meta.summary.z.hist,
            legend = Z.length > 1,
            r = VIZ.conf.r;

        if (VIZ.meta.summary.z.type !== 'categoric') {
            hist = d3.range(N).map(function(d){ return 0; });
            VIZ.data.map(function(d){ hist[bin(d.z)] += 1; });
            VIZ.meta.summary.z.hist = hist;
        }

        d3.select('#plot').append('circle')
            .attr('id','dot')
            .attr('r', 2*r)
            .style('opacity', 0.25)
            .style('display','none');

        d3.select('#clip').select('rect')
            .attr('width', VIZ.width +20)
            .attr('height', VIZ.height +20)
            .attr('transform','translate(-10,-10)');

        plot.append('g')
            .attr('id','points')
            .attr('clip-path','url(#clip)');

        /**************************************************************
            put axis on the top
         **************************************************************/
        VIZ.buildAxes();

        VIZ.xAxis
            .ticks(5)
            .tickSizeInner(-VIZ.height -20)
            .tickSizeOuter(4);

        VIZ.yAxis
            .ticks(4)
            .tickSizeInner(-VIZ.width -20)
            .tickSizeOuter(4);

        VIZ.drawAxes();

        if (legend) {
        /**************************************************************
            set legend
         **************************************************************/
            function labels(d) {
                return VIZ.meta.labels && VIZ.meta.labels[d] ?
                            VIZ.meta.labels[d] : d;
            }

            legend = VIZ.legend();
            if (VIZ.meta.summary.z.type === 'categoric') {
                legend = VIZ.categoricParameter(legend, color, select, deselect, labels);

                d3.select('#Legend')
                    .append('div').html('On the legend: '+
                        (VIZ.meta.zlabel || VIZ.meta.z));

                var desc = d3.select('#Legend').selectAll('.legend')
                                .data(VIZ.conf.zdomain).enter()
                                    .append('div');
                desc.append('span')
                    .attr('class','color')
                    .style('background', color);

                desc.append('span')
                    .html(function(d){ return labels(d); });

            } else {
                legend = VIZ.numericParameter(legend, color, select, deselect);

                d3.select('#Legend')
                    .append('div').html('On the legend: '+
                        (VIZ.meta.zlabel || VIZ.meta.z) +' distribution');
            }
        }

        /**************************************************************
            get actual data in
         **************************************************************/
        if (!VIZ.stream) transition();

        /**************************************************************
            wait for new data to arrive
         **************************************************************/
        if (!VIZ.static) VIZ.transition(transition);

        /**************************************************************
            run configuration
         **************************************************************/
        VIZ.reset = reset;

        /**************************************************************
            enable common utilities
         **************************************************************/
        VIZ.toolbox();
        VIZ.tooltip();
        VIZ.done();
    };


    window.VIZ = VIZ;
})(window);
