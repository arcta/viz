(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    VIZ.matrix = function() {
        /**************************************************************
            configuration
         **************************************************************/
        VIZ.conf['toolbox'] = VIZ.published ?
                    ['Reset','Zoom','Image','Insight']:
                    ['Reset','Zoom','Marker','Image','Insight'];

        VIZ.defaults['scale'] = 1;

        if (!VIZ.meta.z) {
            VIZ.defaults['aggr'] = 'sum';
            VIZ.meta.summary.z = { type:'numeric' };

        } else {
            VIZ.defaults['aggr'] = VIZ.meta['aggr'] || 'mean';
        }

        VIZ.domains();

        ['x','y','z'].map(function(a) {
            if ('categoric' === VIZ.meta.summary[a].type)
                VIZ.defaults[a +'bins'] = VIZ.meta.summary[a].domain.length;
            else VIZ.defaults[a +'bins'] = VIZ.meta[a +'bins'] || 10;
        });

        VIZ.defaults['selected'] = d3.range(VIZ.defaults['zbins'])
                        .map(function(z){ return 1; });

        if (VIZ.defaults['aggr'] === 'sum')
            VIZ.defaults['zdomain'] = [];

        if ('categoric' === VIZ.meta.summary.x.type
            && 'categoric' === VIZ.meta.summary.y.type)
            VIZ.conf['toolbox'] = [];

        VIZ.configure();

        /**************************************************************
            common functionality
         **************************************************************/
        var plot = VIZ.init(), legend,
            Z = VIZ.conf.zdomain,
            xC = ('categoric' === VIZ.meta.summary.x.type),
            yC = ('categoric' === VIZ.meta.summary.y.type),
            bins, hist;

        /**************************************************************
            local functionality
         **************************************************************/
        function color(b) {
            if (null === b) return 'white';

            var Z = VIZ.conf.zdomain,
                gradient, f;

            if ('colormap' in VIZ.meta)
                gradient = d3.scaleLinear().range(VIZ.meta['colormap']);
            else
                gradient = d3.scaleLinear().range(['#551188','#b0220b']);

            f = (b-Z[0])/(Z[1]-Z[0]);
            return gradient(f);
        }

        function select(i) {
            plot.selectAll('.cell')
                .attr('fill-opacity',
                    function(b) {
                        return VIZ.conf.selected[bin(b.z)] ? 0.5 : 0;
                    });
        }

        function deselect() {
            plot.selectAll('.cell')
                .attr('fill-opacity', 0.5);
        }

        function bin(z) {
            var N = VIZ.conf['zbins'], Z = VIZ.conf['zdomain'];
            return Math.min(N-1, parseInt(Math.floor(N*(z - Z[0])/(Z[1] - Z[0])), 10));
        }

        function draw() {
            var w = xC ? VIZ.x.step() : VIZ.width/VIZ.conf['xbins'],
                h = yC ? VIZ.y.step() : VIZ.height/VIZ.conf['ybins'];

            plot.selectAll('.cell')
                .remove();

            plot.selectAll('.cell')
                .data(bins).enter()
                    .append('rect')
                        .classed('cell', true)
                        .attr('width', w)
                        .attr('height', h)
                        .attr('transform',
                            function(b,i) {
                                return 'translate(' + [VIZ.x(b.x) -w/2, VIZ.y(b.y) -h/2] + ')';
                            })
                        .attr('fill', function(b){ return color(b.z); })
                        .attr('fill-opacity', 0.5)
                        .on(_IN,
                            function(b) {
                                if (null === b.z) return;

                                var text, X, Y,
                                    B = bin(b.z),
                                    ok = !!VIZ.conf.selected[B];

                                if (!ok) return;

                                text =  (VIZ.meta['xlabel'] || VIZ.meta['x']) +': '+ VIZ.format('xformat')(b.x) +'\n'+
                                        (VIZ.meta['ylabel'] || VIZ.meta['y']) +': '+ VIZ.format('yformat')(b.y) +'\n'+
                                        (VIZ.meta['zlabel'] || VIZ.meta['z'] || 'density') +': '+ VIZ.format('zformat')(b.z);

                                X = VIZ.margin.left + VIZ.x(b.x) -12;
                                Y = VIZ.margin.top + VIZ.y(b.y);
                                VIZ.info.show(text, [X, Y], true);
                            })
                        .on(_OUT,
                            function() {
                                VIZ.info.hide();
                            });
        }

        function aggregate() {
        /**************************************************************
            calculate bins
         **************************************************************/
            var nX = VIZ.conf['xbins'],
                nY = VIZ.conf['ybins'],
                X = VIZ.conf.xdomain,
                Y = VIZ.conf.ydomain,
                dX = xC ? 0 : (X[1] - X[0])/nX,
                dY = yC ? 0 : (Y[1] - Y[0])/nY,
                norm;

            bins = d3.range(nX*nY).map(function(n) {
                var i = n % nX, j = Math.floor(n/nX);
                return {
                    x: xC ? X[i] : X[0]+dX*(i+0.5),
                    y: yC ? Y[j] : Y[0]+dY*(j+0.5),
                    z: 0,
                    n: 0
                };
            });

            VIZ.data.map(function(d) {
                var i = xC ? X.indexOf(d.x) :
                            Math.min(nX-1, parseInt(Math.floor((d.x - X[0])/dX), 10)),
                    j = yC ? Y.indexOf(d.y) :
                            Math.min(nY-1, parseInt(Math.floor((d.y - Y[0])/dY), 10)),
                    n = j*nX + i;

                bins[n].z += d.z;
                bins[n].n ++;
            });

            norm = d3.sum(bins, function(b){ return b.n; });
            bins.map(function(b) {
                if ('mean' === VIZ.conf['aggr'])
                    b.z = b.n ? b.z/b.n : null;
                else
                    b.z = b.n ? b.n/norm : null;
            });

            ['x','y'].map(function(a) {
                if ('date' === VIZ.meta['summary'][a]['type'])
                    bins.map(
                        function(b,i) {
                            bins[i][a] = new Date(b[a]);
                        });
            });

            VIZ.conf.zdomain = d3.extent(bins, function(b){ return b.z; });
            hist = d3.range(VIZ.conf['zbins'])
                        .map(function(z){ return 0; });

            bins.map(function(b){ hist[bin(b.z)] += 1; });
            VIZ.meta.summary.z.hist = hist;
        }

        function zoom() {
            if (!d3.event || !d3.event.transform
                || d3.event.transform.k === 1
                || d3.event.transform.k === VIZ.conf['scale'])
                return;

            var s = d3.event.transform.k > VIZ.conf['scale'] ? 1:-1,
                bX = VIZ.conf['xbins'] +s,
                bY = VIZ.conf['ybins'] +s;

            if (bX < 2 || bY < 2) return;

            VIZ.conf['scale'] = d3.event.transform.k;

            VIZ.conf['xbins'] = xC ? VIZ.conf['xbins'] : bX;
            VIZ.conf['ybins'] = yC ? VIZ.conf['ybins'] : bY;

            VIZ.conf['selected'] = d3.range(VIZ.conf['zbins'])
                    .map(function(z){ return 1; });

            VIZ.deselect();
            transition();
        }

        function transition() {
            aggregate();
            draw();

            if (!legend) {
                legend = VIZ.legend();
                if ('mean' === VIZ.conf['aggr']) {
                    d3.select('#Legend')
                        .append('div').html('On the legend: '+
                            (VIZ.meta.zlabel || VIZ.meta.z) +' bin average');
                } else {
                    d3.select('#Legend')
                        .append('div').html('On the legend: '+
                            (VIZ.meta.zlabel || 'density'));
                }
                legend = VIZ.numericParameter(legend, color, select, deselect);
            }
            legend.transition();

            if (VIZ.image)
                plot.selectAll('.cell').data(bins)
                    .attr('fill-opacity',
                        function(b,i) {
                            return VIZ.conf.selected[bin(b.z)] ? 0.5 : 0;
                        })
                    .attr('fill', function(b){ return color(b.z); });

            else
                plot.selectAll('.cell').data(bins)
                    .transition().duration(VIZ.conf['transition'])
                        .attr('fill-opacity',
                            function(b,i) {
                                return VIZ.conf.selected[bin(b.z)] ? 0.5 : 0;
                            })
                        .attr('fill', function(b){ return color(b.z); });
        }

        VIZ.zoom = d3.zoom()
            .on('zoom', zoom);

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
        VIZ.reset = transition;

        /**************************************************************
            enable common utilities
         **************************************************************/
        VIZ.toolbox();
        VIZ.tooltip();
        VIZ.done();
    };


    window.VIZ = VIZ;
})(window);
