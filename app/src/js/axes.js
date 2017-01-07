(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        format: https://github.com/d3/d3/wiki/Localization#locale
     ******************************************************************/
    VIZ.format = function(f) {
        var date = 'date' === VIZ.meta['summary'][f.charAt(0)]['type'];

        if (f in VIZ.meta)
            return date ? d3.timeFormat(VIZ.meta[f]) :
                            d3.format(VIZ.meta[f]);

        var formatMillisecond = d3.timeFormat('.%L'),
            formatSecond = d3.timeFormat(':%S'),
            formatMinute = d3.timeFormat('%I:%M'),
            formatHour = d3.timeFormat('%I %p'),
            formatDay = d3.timeFormat('%a %d'),
            formatWeek = d3.timeFormat('%b %d'),
            formatMonth = d3.timeFormat('%Y %b'),
            formatYear = d3.timeFormat('%Y');

        function multiFormat(date) {
          return (d3.timeSecond(date) < date ? formatMillisecond
              : d3.timeMinute(date) < date ? formatSecond
              : d3.timeHour(date) < date ? formatMinute
              : d3.timeDay(date) < date ? formatHour
              : d3.timeMonth(date) < date ? (d3.timeWeek(date) < date ? formatDay : formatWeek)
              : d3.timeYear(date) < date ? formatMonth
              : formatYear)(date);
        }

        return date ? multiFormat :
            function(d){ return d.toLocaleString(); };
    };

    /******************************************************************
        build axes
     ******************************************************************/
    VIZ.axes = function() {
        var domain = [];

        ['x','y','z'].map(function(a) {
            if (a in VIZ.meta['summary']) {
                domain = VIZ.conf[a +'domain'];
                /******************************************************
                    set axix domain
                 ******************************************************/
                switch(VIZ.meta['summary'][a]['type']) {

                    case 'categoric':
                        VIZ[a] = d3.scalePoint();
                        VIZ[a].padding(10);
                        break;

                    case 'date':
                        VIZ[a] = d3.scaleTime();
                        domain = [
                            new Date(domain[0]),
                            new Date(domain[1])
                        ];
                        break;

                    default:
                        VIZ[a] = VIZ.conf[a +'log'] ?
                            d3.scaleLog().base(VIZ.conf[a +'log']) :
                                d3.scaleLinear();
                }
                VIZ[a].domain(domain);
            }
        });

        if ('x' in VIZ.meta['summary'])
            VIZ.x.range([0, VIZ.width]);

        if ('y' in VIZ.meta['summary'])
            VIZ.y.range([VIZ.height, 0]);
    };


    VIZ.buildAxes = function() {
        if ('x' in VIZ.meta['summary']) {
            VIZ.xAxis = d3.axisBottom(VIZ.x)
                .tickFormat(VIZ.format('xformat'));

            d3.select('#plot')
                .append('g')
                    .attr('class','x axis')
                    .attr('transform','translate('+ [0, VIZ.height +20] +')');

            VIZ.meta['xlabel']
                d3.select('#plot')
                    .append('path')
                        .attr('d','M0 0 L'+ VIZ.width +' 0')
                        .attr('class','frame')
                        .attr('transform','translate('+ [0, VIZ.height +13] +')');

            d3.select('#plot')
                .append('text')
                    .attr('id','xlabel')
                    .attr('class','axis-label')
                    .attr('transform','translate('+ [VIZ.width -5, VIZ.height +15] +')')
                    .text(VIZ.meta['xlabel']);
        }

        if ('y' in VIZ.meta['summary']) {
            VIZ.yAxis = d3.axisLeft(VIZ.y)
              .tickFormat(VIZ.format('yformat'));

            d3.select('#plot')
                .append('g')
                    .attr('transform','translate(-20,0)')
                    .attr('class','y axis');

            if (VIZ.meta['ylabel'])
                d3.select('#plot')
                    .append('path')
                        .attr('d','M0 0 L0 '+ VIZ.height)
                        .attr('class','frame')
                        .attr('transform','translate(-12,0)');

            d3.select('#plot')
                .append('text')
                    .attr('id','ylabel')
                    .attr('class','axis-label')
                    .attr('transform','translate(-15,5) rotate(90)')
                    .text(VIZ.meta['ylabel'] || '');
        }

        if ('z' in VIZ.meta['summary']
            && VIZ.meta['summary']['z']['type'] !== 'categoric') {
            VIZ.zAxis = d3.axisLeft(VIZ.z)
                .tickFormat(VIZ.format('zformat'));
        }
    };


    VIZ.drawAxes = function(t) {
        if ('x' in VIZ.meta['summary']) {
            (VIZ.image || !t ? d3 : d3.transition().duration(t))
                .select('.x.axis').call(VIZ.xAxis);

            VIZ.canvas
                .select('.x.axis').selectAll('text')
                    .attr('transform','rotate(-'+ (VIZ.xrotate ? 90 : 0) +')')
                    .style('text-anchor', VIZ.xrotate ? 'end':'middle')
                    .attr('dx', VIZ.xrotate ? '-.5em':'0em')
                    .attr('dy', VIZ.xrotate ? '0em':'1.25em');
        }

        if ('y' in VIZ.meta['summary']) {
            (VIZ.image || !t ? d3 : d3.transition().duration(t))
                .select('.y.axis').call(VIZ.yAxis);

            VIZ.canvas
                .select('.y.axis').selectAll('text')
                    .attr('dx','-.25em')
                    .attr('dy','.25em');

            d3.select('.y.axis').selectAll('path')
                .style('display', VIZ.meta['ylabel'] ? 'block':'none');
        }
    };


    window.VIZ = VIZ;
})(window);
