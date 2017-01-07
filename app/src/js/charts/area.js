(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    VIZ.area = function() {
        /**************************************************************
            configuration
         **************************************************************/
        VIZ.conf['toolbox'] = VIZ.published ?
                    ['Reset','Select','Image','Insight']:
                    ['Reset','Select','Marker','Image','Insight'];

        VIZ.defaults['mode'] = VIZ.meta.mode || 'absolute';
        VIZ.defaults['interpolate'] = VIZ.meta.interpolate || 'Linear';
        VIZ.defaults['bins'] = VIZ.meta.bins || 10;
        VIZ.defaults['ylog'] = VIZ.meta.ylog || false;
        VIZ.defaults['xlog'] = false;
        VIZ.defaults['pin'] = false;

        if (VIZ.defaults['ylog'] === true ||
            VIZ.defaults['ylog'] === 'e') VIZ.defaults['ylog'] = Math.E;

        VIZ.defaults['ctrl'] = VIZ.stream ?
            (VIZ.meta['ctrl'] || ['normalized','absolute','wiggle']) :
            (VIZ.meta['ctrl'] || ['normalized','absolute','wiggle','averages']);

        VIZ.domains();

        if (!Array.isArray(VIZ.defaults['zdomain']))
            VIZ.defaults['zdomain'] = ['y'];
        VIZ.defaults['selected'] = VIZ.defaults['zdomain']
                                    .map(function(z){ return 1; });

        VIZ.configure();

        /**************************************************************
            all layers should have the same x-index
         **************************************************************/
        function xindex() {
            var I = {};

            VIZ.conf['xindex'] = [];
            VIZ.data.map(function(d) {
                if (!I[''+ d.x]) {
                    VIZ.conf['xindex'].push(d.x);
                    I[''+ d.x] = 1;
                }
            });
            VIZ.conf['xindex'].sort(function(a,b){ return a-b; });

            if (VIZ.stream) reset();
        }

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

        function display(d,i) {
            if (data.length === 1) return 'block';
            return VIZ.conf['selected'][i] ? 'block':'none';
        }

        function select(d,i) {
            VIZ[VIZ.conf['mode']](VIZ.conf['transition']);
        }

        function deselect(d,i) {
            plot.selectAll('.area')
                .style('display','block');

            VIZ[VIZ.conf['mode']](VIZ.conf['transition']);
        }

        function drag() {
            var A, B,
                x = Math.max(0, Math.min(d3.event.x, VIZ.width));

            VIZ.SelectCTRL.start = VIZ.SelectCTRL.start || [x,0];
            VIZ.SelectCTRL.stop = [x,VIZ.height];

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

        /**************************************************************
            display modes
         **************************************************************/
        function value(d){ return d.y; }

        function reset() {
            var hm = {};
            data = []; D = [];
            VIZ.conf['xindex'].map(function(x,i) {
                hm[x] = i;
                var d = { x:x };
                Z.map(function(z){ d[z] = null; });
                data.push(d);
            });

            VIZ.data.map(function(d) {
                var z = Z.length > 1 ? Z.indexOf(d.z) : 0;
                data[hm[d.x]]['z' in VIZ.meta ? d.z : 'y'] = VIZ.conf['selected'][z] ? d.y : 0;
            });
        }

        function change(t) {
            VIZ.drawAxes(t);

            d3.select('#ylabel')
                .text(VIZ.conf['mode'] === 'wiggle' ?
                    '' : VIZ.meta['ylabel'] || '');

            if (VIZ.image || !t)
                plot.selectAll('.area').data(data)
                    .style('display', display)
                    .attr('d', area);
            else
                plot.selectAll('.area').data(data)
                    .style('display', display)
                    .transition().duration(t) //.ease(d3.easeLinear)
                        .attr('d', area);

            control.selectAll('g')
                .attr('id', function(d){ return d; })
                .style('cursor',
                    function(d){
                        return d === VIZ.conf['mode'] ? 'default':'pointer';
                    })
                .style('opacity',
                    function(d){
                        return d === VIZ.conf['mode'] ? 1 : 0.4;
                    });

            if (VIZ.conf['pin'])
                align(VIZ.conf['pin'], t || 0);
        }

        VIZ.absolute = function(t) {
            reset();
            /**********************************************************
                Y: absolute value
             **********************************************************/
            layers = d3.stack().keys(Z);

            if ('ylim' in VIZ.meta) {
                VIZ.y.domain(VIZ.meta.ylim);

            } else {
                D = d3.extent(data.map(function(d,i) {
                    return d3.sum(Z, function(z){ return d[z]; });
                }));
                D[0] = Math.min(0,D[0]);
                VIZ.y.domain(D);
            }
            data = layers(data);

            VIZ.yAxis
                .tickValues(null)
                .tickFormat(VIZ.format('yformat'));

            VIZ.conf['mode'] = 'absolute';
            change(t);
        };

        VIZ.normalized = function(t) {
            reset();
            /**********************************************************
                Y: mapped to [0,1]
             **********************************************************/
            layers = d3.stack().keys(Z)
                .offset(d3.stackOffsetExpand);
            data = layers(data);

            VIZ.y.domain([0,1]);

            VIZ.yAxis
                .tickValues([0.25, 0.5, 0.75])
                .tickFormat(d3.format('.2f'));

            VIZ.conf['mode'] = 'normalized';
            change(t);
        };

        VIZ.wiggle = function(t) {
            reset();
            /**********************************************************
                Y: minimize weighted change in slope
             **********************************************************/
            layers = d3.stack().keys(Z)
                .offset(d3.stackOffsetWiggle);
            data = layers(data);

            D[0] = d3.min(d3.range(data[0].length).map(function(i) {
                return d3.min(data, function(d){ return d[i][0]; });
            }));

            D[1] = d3.max(d3.range(data[0].length).map(function(i) {
                return d3.max(data, function(d){ return d[i][1]; });
            }));

            VIZ.y.domain(D);

            VIZ.yAxis
                .tickValues(null)
                .tickFormat(VIZ.format('yformat'));

            VIZ.conf['mode'] = 'wiggle';
            change(t);
        };

        VIZ.averages = function(t) {
            reset();
            unpin();
            d3.select('#align').style('display','none');
            /**********************************************************
                Y: rolling averages within selected area
             **********************************************************/
            layers = d3.stack().keys(Z);

            var X = Math.floor((VIZ.conf['xdomain'][1] - VIZ.conf['xdomain'][0])/VIZ.conf['bins']),
                N = parseInt(Math.floor(VIZ.defaults['xdomain'][1] - VIZ.defaults['xdomain'][0])/X, 10),
                A = d3.range(N + 1).map(
                        function(D,I) {
                            return {
                                x: VIZ.defaults['xdomain'][0] + X*I,
                                n: 0
                            };
                        });

            data.map(function(d,i) {
                var T = VIZ.meta.summary.x.type === 'date' ? d.x.getTime() : d.x,
                    j = parseInt(Math.floor((T - VIZ.defaults['xdomain'][0])/X), 10);

                Z.map(function(z) {
                    A[j][z] = A[j][z] || 0;
                    A[j][z] += d[z];
                    A[j].n += 1;
                });
            });

            data.map(function(d,i) {
                var T = VIZ.meta.summary.x.type === 'date' ? d.x.getTime() : d.x,
                    j = parseInt(Math.floor((T - VIZ.defaults['xdomain'][0])/X), 10);

                Z.map(function(z){ d[z] = A[j][z]/A[j].n; });
                d.x = VIZ.meta.summary.x.type === 'date' ? new Date(A[j].x) : A[j].x;
            });

            D = d3.extent(data.map(function(d,i) {
                return d3.sum(Z, function(z){ return d[z]; });
            }));
            D[0] = Math.min(0,D[0]);
            VIZ.y.domain(D);
            data = layers(data);

            VIZ.yAxis
                .tickValues(null)
                .tickFormat(VIZ.format('yformat'));

            VIZ.conf['mode'] = 'averages';
            change(t);
        };

        /**************************************************************
            data transition
         **************************************************************/
        function transition() {
            xindex();

            control.select('#averages')
                .style('display',
                    VIZ.conf['bins'] > VIZ.conf['xindex'].length/2 ?
                                'none':'block');

            control.select('#normalized')
                .style('display', Z.length < 2 ? 'none':'block');

            /**********************************************************
                if data changed
             **********************************************************/
            var areas = plot.select('#areas')
                .selectAll('.area').data(layers(data));

            areas.enter()
                .append('path')
                    .classed('area', true)
                //.merge(areas) //???
                    .attr('d', area)
                    .attr('fill',
                        function(d,i) {
                            return Z[i] ? color(Z[i], i) : color();
                        })
                    .style('display', display);

            areas.exit()
                .remove();

            if (VIZ.image) imageTransition(areas);
            else if (VIZ.stream) streamTransition(areas);
            else dataTransition(areas);
        }

        function imageTransition(areas) {
            VIZ[VIZ.conf['mode']]();
            if (VIZ.conf['pin']) align(VIZ.conf['pin']);
        }

        function streamTransition(areas) {
            d3.select('#align')
                .attr('transform','translate('
                    + [VIZ.margin.left+VIZ.width, VIZ.margin.top] +')');

            var t = new Date(),
                t0 = t.getTime() - (VIZ.meta['window'] || VIZ.conf['window']),
                n = data.length;

            VIZ[VIZ.conf['mode']]();
            VIZ.x.domain([new Date(t0), t]);
            VIZ[VIZ.conf['mode']](VIZ.conf['transition']);
            align(n-1 || 0, VIZ.conf['transition']);
            VIZ.drawAxes(VIZ.conf['transition']);
        }

        function dataTransition(areas) {
            if (VIZ.dynamic
                && VIZ.meta.summary.x.type === 'date')
                    VIZ.x.domain([new Date(VIZ.data[0].x), new Date()]);

            VIZ[VIZ.conf['mode']](VIZ.conf['transition']);
            if (VIZ.conf['pin'])
                align(VIZ.conf['pin'], VIZ.conf['transition']);
        }

        /**************************************************************
            initialize plot with empty data
         **************************************************************/
        var Z = VIZ.conf.zdomain,
            legend = Z.length > 1,
            D = [], data = [],

            area = d3.area()
                .defined(function def(d){ return d.y !== null; })
                .x(function(d){ return VIZ.x(d.data.x); })
                .y0(function(d){ return VIZ.y(d[0]); })
                .y1(function(d){ return VIZ.y(d[1]); })
                .curve(d3['curve'+ VIZ.defaults['interpolate']]),

            layers = d3.stack().keys(Z);

        plot.append('g')
            .attr('id','areas')
            .attr('clip-path','url(#clip)');

        /**************************************************************
            put axis on the top
         **************************************************************/
        VIZ.buildAxes();

        VIZ.xAxis
            .ticks(5)
            .tickSizeInner(0)
            .tickSizeOuter(4);

        VIZ.yAxis
            .ticks(4)
            .tickSizeInner(-VIZ.width -20)
            .tickSizeOuter(4);

        /**************************************************************
            add mouse-over
         **************************************************************/
        VIZ.canvas.append('g')
            .attr('id','align')
                .on(_CLICK, pin)
            .style('display','none')
                .append('line')
                    .attr('x1',0)
                    .attr('x2',0)
                    .attr('y1',1)
                    .attr('y2',VIZ.height +8);

        d3.select('#align').append('text')
            .attr('class','label')
            .attr('dy','-.9em');

        d3.select('#align').selectAll('g')
            .data(d3.range(Z.length)).enter()
                .append('g')
                    .attr('class','dot');

        d3.select('#align').selectAll('.dot')
            .append('circle')
                .attr('r', 5)
                .attr('stroke',
                    function(i) {
                        return Z ? color(Z[i],i) : color();
                    })
                .attr('stroke-width', 5)
                .attr('stroke-opacity', 0.75)
                .attr('fill','white');

        d3.select('#align').append('path')
            .attr('transform','translate(0,-20)')
            .attr('d','M-6 0 L6 0 L3 8 L5 10 L1 10 L0 20 L-1 10 L-5 10 L-3 8 Z')
            .attr('id','pin');

        function find(x) {
            if (data.length === 0) return;
            for (var i = 0; i < VIZ.conf.xindex.length; ++i)
                if (VIZ.x(VIZ.conf.xindex[i]) >= x) return i;
            return VIZ.conf.xindex.length -1;
        }

        function align(i,t) {
            var x = VIZ.x(VIZ.conf.xindex[i]),
                text = VIZ.format('xformat')(VIZ.conf.xindex[i]);

            function _anch() {
                if (VIZ.conf['pin'])
                    return x > VIZ.width/2 ? 'end':'start';
                return 'middle';
            }

            function _dx() {
                if (VIZ.conf['pin'])
                    return x > VIZ.width/2 ? -15:15;
                return 0;
            }

            if (x < 0 || x > VIZ.width)
                return unpin();

            if (legend) {
                legend.selectAll('.legend').select('text')
                    .text(
                        function(z,j) {
                            if (!VIZ.conf.selected[j]) return '';
                            if (data[j][i].data[z] === null) return 'n/a';
                            if ('normalized' === VIZ.conf['mode'])
                                return d3.format(',.2%')(data[j][i].data[z]);
                            return VIZ.format('yformat')(data[j][i].data[z]);
                        });

                d3.select('#align').select('text')
                    .attr('dx', _dx())
                    .style('text-anchor', _anch())
                    .text(text);

            } else {
                text = text +' [ '+
                    (data[0][i].data.y === null ? 'N/A' :
                        VIZ.format('yformat')(data[0][i].data.y)) +' ]';

                d3.select('#align').select('text')
                    .attr('dx', _dx())
                    .style('text-anchor', _anch())
                    .text(text);
            }

            d3.select('#pin')
                .style('display', VIZ.conf['pin'] ? 'block':'none');

            if (VIZ.image || !t) {
                d3.select('#align')
                    .style('display','block')
                    .attr('transform','translate('+ [VIZ.margin.left+x, VIZ.margin.top] +')')
                .selectAll('.dot')
                    .style('display',
                        function(z,j) {
                            if (VIZ.conf.mode !== 'absolute') return 'none';
                            if (data[j][i].data[z] === null) return 'none';
                            return display(z,j);
                        })
                    .attr('transform',
                        function(j) {
                            if (data[j][i].data[Z[j]] === null)
                                return 'translate('+ [0,VIZ.height] +')';
                            return 'translate('+ [0,VIZ.y(data[j][i][0] + data[j][i].data[Z[j]])] +')';
                        });
            } else {
                d3.select('#align')
                    .style('display','block')
                .transition().duration(t)
                    .attr('transform','translate('+ [VIZ.margin.left+x, VIZ.margin.top] +')')
                .selectAll('.dot')
                    .style('display',
                        function(z,j) {
                            if (VIZ.conf.mode !== 'absolute') return 'none';
                            if (data[j][i].data[z] === null) return 'none';
                            return display(z,j);
                        })
                    .attr('transform',
                        function(j) {
                            if (data[j][i].data[Z[j]] === null)
                                return 'translate('+ [0,VIZ.height] +')';
                            return 'translate('+ [0,VIZ.y(data[j][i][0] + data[j][i].data[Z[j]])] +')';
                        });
            }
        }

        function pin() {
            if (VIZ.stream || 'refresh' in VIZ.meta
                || VIZ.conf['mode'] === 'averages') return;

            var X = d3.event.pageX - VIZ.margin.left,
                i = find(X), x = VIZ.x(VIZ.conf.xindex[0]);

            VIZ.conf['pin'] = VIZ.conf['pin'] ? false : i;
            align(i);
        }

        function unpin() {
            VIZ.conf['pin'] = false;
            d3.select('#pin').style('display','none');
            d3.select('#align').style('display','none');
            if (legend) legend.selectAll('.legend').select('text').text('');
        }

        plot.append('rect')
            .attr('class','tooltip-overlay')
            .attr('width', VIZ.width)
            .attr('height', VIZ.height)
            .on(_MOVE,
                function() {
                    if (data.length === 0) return;

                    var X = d3.event.pageX - VIZ.margin.left,
                        i = find(X);

                    if (!VIZ.conf['pin'])
                        align(i, 100);
                })
            .on(_OUT,
                function(d) {
                    if (VIZ.conf['pin']) return;
                    VIZ.info.hide();
                    unpin();
                })
            .on(_CLICK, pin);

        if (legend) {
            /**********************************************************
                make legend
             **********************************************************/
            function labels(d) {
                return VIZ.meta.labels && VIZ.meta.labels[d] ?
                            VIZ.meta.labels[d] : d;
            }

            legend = VIZ.legend();
            legend = VIZ.simpleLegend(legend, color, select, deselect, labels);

            legend.selectAll('.legend')
                .append('rect')
                    .attr('transform', function(d,i){ return 'translate('+ [4,-10] +')'; })
                    .attr('width', 15)
                    .attr('height', 14)
                    .attr('fill', color)
                    .attr('fill-opacity', 0.5);

            legend.selectAll('.legend').select('text')
                .attr('transform', function(d,i){ return 'translate(25,4)'; })
                .text(function(d){ return VIZ.image ? d : ''; });

            d3.select('#Legend')
                .append('div').html('On the legend: '+
                    (VIZ.meta.zlabel || ''));

            var info = d3.select('#Legend').selectAll('.legend')
                            .data(VIZ.conf.zdomain).enter()
                                .append('div');
            info.append('span')
                .attr('class','color')
                .style('background', color);

            info.append('span')
                .html(function(d){ return labels(d); });
        }

        /**************************************************************
            enable mode control
         **************************************************************/
        var control = d3.select('#ctrl');

        function camelize(str) {
            return str.charAt(0).toUpperCase() + str.substr(1);
        }

        control.selectAll('g')
            .data(VIZ.conf['ctrl']).enter()
                .append('g')
                    .attr('id', function(d){ return d; })
                    .attr('transform',
                        function(d,i) {
                            return 'translate('+ [10, 20*i] +')';
                        })
                    .on(_IN,
                        function(d,i) {
                            VIZ.info.show(camelize(d), [
                                VIZ.margin.left + VIZ.width,
                                VIZ.margin.top +100 +20*i]);
                        })
                    .on(_CLICK,
                        function(d) {
                            VIZ.conf['mode'] = d;
                            VIZ[d](VIZ.conf['transition']);
                        })
                .append('rect')
                    .attr('transform','translate(-4,-4)')
                    .attr('width', 20)
                    .attr('height', 20)
                    .attr('fill','white');

        control.select('#absolute').selectAll('path')
            .data([3,7,5,0,4]).enter()
                .append('path')
                    .attr('transform',
                        function(d,i) {
                            return 'translate('+ [i*3,0] +')';
                        })
                    .attr('d',
                        function(d) {
                            return 'M0 '+ d +' L0 14';
                        });

        control.select('#normalized').selectAll('path')
            .data(d3.range(5)).enter()
                .append('path')
                    .attr('transform',
                        function(d) {
                            return 'translate('+ [d*3,0] +')';
                        })
                    .attr('d','M0 0 L0 14');

        control.select('#wiggle').selectAll('path')
            .data([5,11,9,15,7]).enter()
                .append('path')
                    .attr('transform',
                        function(d,i) {
                            return 'translate('+ [i*3,0] +')';
                        })
                    .attr('d',
                        function(d) {
                            return 'M'+ [0,(15-d)/2] +' L'+ [0,(15+d)/2];
                        });

        control.select('#averages').selectAll('circle')
            .data([7,4,1]).enter()
                .append('circle')
                    .attr('transform','translate(6.5,7)')
                    .attr('r', function(d){ return d; })
                    .style('stroke','gray')
                    .style('stroke-width', 2)
                    .style('fill','none');

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
        VIZ.reset = function() {
            VIZ.viewport(VIZ.conf['transition']);

            plot.selectAll('.area')
                .style('display', display);

            if (VIZ.conf['pin']) align(VIZ.conf['pin'], VIZ.conf['transition']);
            else unpin();

            if (legend) legend.reset();
            VIZ[VIZ.conf['mode']](VIZ.conf['transition']);
        };

        /**************************************************************
            enable common utilities
         **************************************************************/
        VIZ.toolbox();
        VIZ.tooltip();
        VIZ.done();
    };


    window.VIZ = VIZ;
})(window);
