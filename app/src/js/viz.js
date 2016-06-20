(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        events shortcuts
     ******************************************************************/
    if ('ontouchstart' in window) {
        window._IN = 'touchstart';
        window._OUT = 'touchend';
        window._MOVE = 'touchmove';
        window._CLICK = 'touchstart';

    } else {
        window._IN = 'mouseover';
        window._OUT = 'mouseout';
        window._MOVE = 'mousemove';
        window._CLICK = 'click';
    }

    /******************************************************************
        default size
     ******************************************************************/
    VIZ.conf = VIZ.conf || {};
    VIZ.conf['size'] = [ window.innerWidth, window.innerHeight ];

    /******************************************************************
        any specific VIZ should know if it was modified
     ******************************************************************/
    VIZ.modified = VIZ.modified || function(){ return false; };

    /******************************************************************
        rendering func
     ******************************************************************/
    VIZ.render = function(draw, canvas) {
        draw = draw || function(){};
        canvas = canvas || 'svg';

        VIZ.evaluate();

        function render() {
            d3.selectAll(canvas)
                .remove();

            VIZ.data = VIZ.data || [];
            VIZ.conf['size'] = [ window.innerWidth, window.innerHeight ];

            ['x','y','z'].map(function(d) {
                if (VIZ.meta['summary'][d]
                    && 'date' === VIZ.meta['summary'][d]['type']) {

                    VIZ.data.sort(
                        function(a,b) {
                            return a[d] - b[d];
                        });

                    VIZ.data.map(
                        function(D,I) {
                            VIZ.data[I][d] = new Date(1000*D[d]);
                        });
                }
            });

            VIZ.canvas = d3.select('body')
                .append(canvas)
                    .attr('width', VIZ.conf['size'][0])
                    .attr('height', VIZ.conf['size'][1]);
            draw();
        }

        window.onresize = render;

        if (VIZ.static) return render();
        if (VIZ.stream) return render();

        VIZ.refresh(render);
     };


    VIZ.refresh = function(callback) {
        d3.json(VIZ.host +'/filter/'+ VIZ.id, function(err, obj) {
            if (err) return console.log(err);
            VIZ.data = obj.data;
            VIZ.meta = obj.meta;
            callback();
        });
    };


    VIZ.transition = function(transition) {
        transition = transition || function(){};

        if (VIZ.static) return;

        function transform(data) {
            data = JSON.parse(data);

            VIZ.meta['window'] = VIZ.meta['window'] || 60;

            var t = new Date(),
                T = parseInt(t.getTime()/1000,10),
                delta = T - 2*VIZ.meta['window'],
                G = typeof(VIZ.meta['y']) === 'object',
                D = !G ? [{ TIMESTAMP:T }] :
                        VIZ.meta['y'].map(
                            function(d) {
                                return { TIMESTAMP:T, z:d };
                            });

            ['x','y','z'].map(function(a) {
                D.map(function(d,i) {
                    if (a in VIZ.meta) {
                        if (a === 'y' && G)
                            d[a] = data[VIZ.meta['y'][i]];

                        else if (VIZ.meta[a] === 'TIMESTAMP')
                            d[a] = t;

                        else if (a === 'z' && G)
                            d[a] = d[a];

                        else d[a] = data[VIZ.meta[a]];
                    }
                });
            });

            while (VIZ.data.length > 0
                    && VIZ.data[0]['TIMESTAMP'] < delta)
                VIZ.data.shift();

            D.map(function(d){ VIZ.data.push(d); });
            transition();
        }

        if (VIZ.stream)
            return io.connect().on(VIZ.meta['source'], transform);

        if (VIZ.dynamic && VIZ.meta['refresh'])
            return window.setInterval(function(){ VIZ.refresh(transition); },
                            1000*Math.max(1,VIZ.meta['refresh']));
    };


    VIZ.plot = function() {
        VIZ.margins();
        VIZ.width = VIZ.conf['size'][0] - VIZ.margin.left - VIZ.margin.right;
        VIZ.height = VIZ.conf['size'][1] - VIZ.margin.top - VIZ.margin.bottom;

        VIZ.canvas.append('g')
            .attr('id','plot')
            .attr('transform','translate('+ [ VIZ.margin.left, VIZ.margin.top ] +')');

        d3.select('#plot').append('text')
            .attr('transform','translate(0,-25)')
            .attr('class','title')
            .text(VIZ.meta['title'] || '');

        VIZ.canvas.append('rect')
            .attr('class','zoom')
            .attr('width', VIZ.conf['size'][0])
            .attr('height', VIZ.conf['size'][1])
            .style('display','none');

        VIZ.axes();

        return d3.select('#plot').append('g');
    };


    VIZ.frame = function(plot) {
        /**************************************************************
            clip frame for zooming
         **************************************************************/
        plot.select('.frame')
            .remove();

        plot.append('path')
            .attr('class','frame')
            .attr('d','M0,0 L'+ [0, VIZ.height]
                       +' L'+ [VIZ.width, VIZ.height]
                       +' L'+ [VIZ.width, 0]
                       +' L0,0'
                       +' M'+ [-VIZ.margin.left, -VIZ.margin.top]
                       +' L'+ [VIZ.width + VIZ.margin.right, -VIZ.margin.top]
                       +' L'+ [VIZ.width + VIZ.margin.right, VIZ.height + VIZ.margin.bottom]
                       +' L'+ [-VIZ.margin.left, VIZ.height + VIZ.margin.bottom]
                       +' L'+ [-VIZ.margin.left, -VIZ.margin.top]);

        plot.append('text')
            .attr('transform','translate(0,-25)')
            .attr('class','title')
            .text(VIZ.meta['title'] || '');
    };

    /******************************************************************
        calculate margins to fit the labels and legend
     ******************************************************************/
    VIZ.margins = function() {
        var span = 0, labels,
            S = VIZ.meta['summary'];

        function format(v,f) {
            return VIZ.format(f)(v);
        }

        /**************************************************************
            default ( if no axes and no legend )
         **************************************************************/
        VIZ.margin = {
            left: Math.max(50,   0.05*VIZ.conf['size'][0]),
            right: Math.max(50,  0.05*VIZ.conf['size'][0]),
            top: Math.max(50,    0.05*VIZ.conf['size'][1]),
            bottom: Math.max(50, 0.05*VIZ.conf['size'][1])
        };

        /**************************************************************
            fit legend ( Z axis ) if any
         **************************************************************/
        if ('z' in S) {
            if ('hist' in S['z']) {
                span = VIZ.textsize(S['z']['domain'],'label');

                VIZ.margin.right = Math.max(0.15*VIZ.conf['size'][0], span +120);
                if ('zlabel' in VIZ.meta) {
                    span = VIZ.textsize([VIZ.meta['zlabel']],'axis-label')
                    VIZ.margin.right = Math.max(VIZ.margin.right, span +50);
                }

            } else if ('range' in S['z']) {
                span = VIZ.textsize(S['z']['range']
                        .map(function(d){ return format(d,'zformat'); }),'label');

                VIZ.margin.right = Math.max(120, span +(VIZ.data.length < VIZ.switch ? 100:135));
            }
        }

        /**************************************************************
            fit Y axis if any
         **************************************************************/
        if ('y' in S) {
            if ('hist' in S['y'])
                span = VIZ.textsize(S['z']['domain'],'label');

            else if ('range' in S['y'])
                span = VIZ.textsize(S['y']['range']
                        .map(function(d){
                            return format('date' === S['y']['type'] ?
                                new Date(1000*d) : d,'yformat'); }),'label');

            VIZ.margin.left = Math.max(VIZ.margin.left, span +50);
        }

        /**************************************************************
            fit X axis if any ( after Y & Z margin recalc )
         **************************************************************/
        if ('x' in S) {
            if ('categorical' === S['x']['type']) {
                labels = S['x']['domain'];
                span = VIZ.textsize(labels,'label');

                if (span > (VIZ.conf['size'][0] - VIZ.margin.left - VIZ.margin.right)/labels.length) {
                    VIZ.margin.bottom = Math.max(VIZ.margin.bottom, span +50);
                    VIZ.xrotate = true;
                }
            }
        }
    };

    /******************************************************************
        figure out max pix-span for the list of strings 
     ******************************************************************/
    VIZ.textsize = function(text, style) {
        var test, size, max = 0;

        VIZ.canvas.append('g')
            .style('opacity', 0)
            .attr('id','textsize')
        .selectAll('text')
            .data(text).enter()
                .append('text')
                    .attr('class', style)
                    .text(function(d){ return d; });

        test = document.getElementById('textsize').childNodes;
        for (var i = 0; i < test.length; ++i) {
            size = Math.round(test[i].getComputedTextLength());
            max = Math.max(max, size);
        };

        d3.select('#textsize')
            .remove();

        return max;
    };

    /******************************************************************
        format: https://github.com/d3/d3/wiki/Localization#locale
     ******************************************************************/
    VIZ.format = function(f) {
        var date = 'date' === VIZ.meta['summary'][f.charAt(0)]['type'];

        if (f in VIZ.meta)
            return date ? d3.time.format(VIZ.meta[f]) :
                            d3.format(VIZ.meta[f]);

        return date ? d3.time.format.multi([
              [".%L",   function(d){ return d.getMilliseconds(); }],
              [":%S",   function(d){ return d.getSeconds(); }],
              ["%I:%M", function(d){ return d.getMinutes(); }],
              ["%I %p", function(d){ return d.getHours(); }],
              ["%a %d", function(d){ return d.getDay() && d.getDate() != 1; }],
              ["%b %d", function(d){ return d.getDate() != 1; }],
              ["%Y %b", function(d){ return d.getMonth(); }],
              ["%Y",    function(){ return true; }]
            ]) : function(d){ return d.toLocaleString(); };
    };

    /******************************************************************
        build axes 
     ******************************************************************/
    VIZ.axes = function() {
        var domain = [],
            S = VIZ.meta['summary'];

        ['x','y','z'].map(function(a) {
            if (a in S) {
                domain = S[a]['domain'];

                /******************************************************
                    keep domain through the session
                 ******************************************************/
                if (VIZ.dynamic && !VIZ.meta[a +'lim']) {
                    if ('date' === S[a]['type'])
                        domain = [
                            S[a]['domain'][0],
                            (new Date()).getTime()/1000
                        ];

                    else if ('categorical' !== S[a]['type'])
                        domain = [
                            S[a]['mean'] - 4*S[a]['std'],
                            S[a]['mean'] + 4*S[a]['std']
                        ];
                }

                if (VIZ.stream && !VIZ.meta[a +'lim']) {
                    if ('date' === S[a]['type'])
                        domain = [
                            (new Date()).getTime()/1000 - (VIZ.meta['window'] || 60),
                            (new Date()).getTime()/1000
                        ];

                    else if ('categorical' !== S[a]['type'])
                        domain = [
                            -VIZ.data[0][a],
                            3*VIZ.data[0][a]
                        ];
                }

                if (!VIZ.static) VIZ[a +'domain'] = domain;

                /******************************************************
                    set axix domain
                 ******************************************************/
                switch(S[a]['type']) {

                    case 'categorical':
                        VIZ[a] = d3.scale.ordinal();
                        break;

                    case 'date':
                        VIZ[a] = d3.time.scale();
                        domain = [
                            new Date(1000*domain[0]),
                            new Date(1000*domain[1])
                        ];
                        break;

                    default:
                        VIZ[a] = VIZ.meta[a +'log'] ?
                            d3.scale.log().base(VIZ.meta[a +'log']) :
                                d3.scale.linear();
                }
                VIZ[a].domain(domain);
            }
        });

        if ('x' in S) {
            if ('categorical' === S['x']['type'])
                VIZ.x.rangeBands([0, VIZ.width]);
            else
                VIZ.x.range([0, VIZ.width]);
        }

        if ('y' in S) {
            if ('categorical' === S['y']['type'])
                VIZ.y.rangeBands([VIZ.height, 0]);
            else
                VIZ.y.range([VIZ.height, 0]);
        }
    };


    VIZ.buildAxes = function() {
        if ('x' in VIZ.meta['summary']) {
            VIZ.xAxis = d3.svg.axis()
                .scale(VIZ.x)
                .tickFormat(VIZ.format('xformat'))
                .orient('bottom');

            var w = VIZ.textsize([VIZ.meta['xlabel']],'axis-label');

            d3.select('#plot')
                .append('g')
                    .attr('class','x axis')
                    .attr('transform','translate('+ [0, VIZ.height +20] +')');

            if ('xlabel' in VIZ.meta && VIZ.meta['xlabel'] !== '') {
                d3.select('#plot')
                    .append('rect')
                        .attr('height', 18)
                        .attr('width', w +16)
                        .attr('class','screen')
                        .attr('transform','translate('+ [VIZ.width -w -15, VIZ.height +2] +')');

                d3.select('#plot')
                    .append('text')
                        .attr('class','axis-label')
                        .attr('transform','translate('+ [VIZ.width -5, VIZ.height +15] +')')
                        .text(VIZ.meta['xlabel']);
            }
        }

        if ('y' in VIZ.meta['summary']) {
            VIZ.yAxis = d3.svg.axis()
              .scale(VIZ.y)
              .tickFormat(VIZ.format('yformat'))
              .orient('left');

            d3.select('#plot')
                .append('g')
                    .attr('transform','translate(-20,0)')
                    .attr('class','y axis');

            if ('ylabel' in VIZ.meta && VIZ.meta['ylabel'] !== '') {
                d3.select('#plot')
                    .append('rect')
                        .attr('width', 18)
                        .attr('height', VIZ.textsize([VIZ.meta['ylabel']],'axis-label')+10)
                        .attr('class','screen')
                        .attr('transform','translate(-19,0)');

                d3.select('#plot')
                  .append('text')
                    .attr('class','axis-label')
                    .attr('transform','translate(-6,5) rotate(-90)')
                    .text(VIZ.meta['ylabel'] || '');
            }
        }

        if ('z' in VIZ.meta['summary'] && 'range' in VIZ.meta['summary']['z']) {
            VIZ.zAxis = d3.svg.axis()
                .scale(VIZ.z)
                .ticks(4)
                .tickFormat(VIZ.format('zformat'))
                .orient('right');
        }
    };


    VIZ.callAxes = function() {
        if ('x' in VIZ.meta['summary']) {
            VIZ.canvas
                .select('.x.axis')
                    .call(VIZ.xAxis);
            VIZ.canvas
                .select('.x.axis').selectAll('text')
                    .attr('transform','rotate(-'+ (VIZ.xrotate ? 90 : 0) +')')
                    .style('text-anchor', VIZ.xrotate ? 'end':'middle')
                    .attr('dx', VIZ.xrotate ? '-.5em':'0em')
                    .attr('dy', VIZ.xrotate ? '0em':'1.2em');
        }

        if ('y' in VIZ.meta['summary']) {
            VIZ.canvas
                .select('.y.axis')
                    .call(VIZ.yAxis);
            VIZ.canvas
                .select('.y.axis').selectAll('text')
                  .attr('dx','-.25em')
                  .attr('dy','.4em');
        }
    };

    /******************************************************************
        build legend
     ******************************************************************/
    VIZ.legend = function() {
        if (!VIZ.meta['z']) return false;

        if (VIZ.meta['switch'] === false) VIZ.switch = Infinity;
        else VIZ.switch = VIZ.meta['switch'] || VIZ.switch;

        var datum = VIZ.meta['summary']['z']['domain'];

        if (datum.length < 2) return false;
        if (datum.length === 2 && datum[0] === datum[1]) return false;

        var legend = d3.select('#plot')
            .append('g');

        legend.append('rect')
            .attr('class','legend-rect')
            .attr('rx', 6);

        legend.append('text')
            .attr('class','axis-label')
            .text(VIZ.meta['zlabel'] || '');

        return legend;
    };

    /******************************************************************
        set flag for phantomjs-horseman 
     ******************************************************************/
    VIZ.done = function() {
        VIZ.canvas.append('g')
            .attr('id','done');
    };

    window.VIZ = VIZ;
})(window);
