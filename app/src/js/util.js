(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    VIZ.info = VIZ.info || { show:function(){}, hide:function(){} };


    VIZ.hash = function(str) {
        return encodeURIComponent(str);
    };


    VIZ.orig = function() {
        return VIZ.host +'/d3/'+ VIZ.id;
    };


    VIZ.save = function(label, insight, callback) {
        callback = callback || function(data){};

        VIZ.insights[VIZ.hash(label)] = insight;

        d3.json(VIZ.host +'/')
            .header('Content-Type','application/json')
            .post(JSON.stringify({
                        meta: VIZ.meta,
                        data: VIZ.data,
                        insights: VIZ.insights
                    }),
                function(err, data) {
                    if (err) return console.log(err);
                    callback(data);
                });
    };


    VIZ.viewport = function(t) {
        ['x','y'].map(function(a) {
            if (VIZ.meta.summary[a]['type'] === 'date')
                VIZ[a].domain([
                    new Date(VIZ.conf[a +'domain'][0]),
                    new Date(VIZ.conf[a +'domain'][1])
                ]);
            VIZ[a].domain(VIZ.conf[a +'domain'].slice());
        });
        VIZ.drawAxes(t);
    };


    VIZ.Control = function( id,
                            description,
                            screen,
                            action,
                            mouseover,
                            mouseout,
                            render,
                            check   ) {
    /******************************************************************
        proto for settings-control object
    *******************************************************************/
        this.id = id;
        this.description = description || id +'-Control Tooltip';
        this.hasScreen = screen || false;
        this.isActive = false;

        this.action = function() {
            if (typeof(action) === 'function') action();
            else console.log(id +'-Control Action');
        };

        this.mouseover = function() {
            if (typeof(mouseover) === 'function') mouseover();

            d3.select('#'+ id)
                .style('opacity', 0.75);
            VIZ.info
                .show(ctrl.description,
                        [window.innerWidth -100, 100]);
        };

        this.mouseout = function() {
            if (typeof(mouseout) === 'function') mouseout();

            d3.select('#'+ id)
                .style('opacity', ctrl.isActive ? 1 : 0.5);
            VIZ.info.hide();
        };

        this.render = function() {
            if (this.hasScreen)
                d3.select('#screens')
                    .append('g')
                        .attr('id', id +'Screen')
                        .style('display','none')
                    .append('rect')
                        .attr('width', VIZ.width)
                        .attr('height', VIZ.height);


            typeof(render) === 'function' ? render() :
                d3.select('#'+ id).append('circle')
                    .attr('r', 7)
                    .attr('transform','translate(7,7)');

            d3.select('#'+ id)
                .style('opacity', 0.5)
                .style('display', ctrl.isEnabled() ? 'block':'none')
                .on(_IN, this.mouseover)
                .on(_OUT, this.mouseout)
                .on(_CLICK,
                    function() {
                        ctrl.isActive = !ctrl.isActive;
                        if (ctrl.isActive) {
                            ctrl.action();
                            VIZ.conf['toolbox'].map(
                                function(i){
                                    if (i !== ctrl.id)
                                        VIZ[i +'CTRL'].deactivate();
                                });

                            if (ctrl.hasScreen)
                                d3.select('#'+ id +'Screen')
                                    .style('display','block');

                            d3.select('#'+ id)
                                .style('opacity', 1);

                        } else {
                            if (ctrl.hasScreen)
                                d3.select('#'+ id +'Screen')
                                    .style('display','none');

                            d3.select('#'+ id)
                                .style('opacity', 0.5);

                            VIZ.conf['toolbox'].map(
                                function(i){
                                    d3.select('#'+ i)
                                        .style('display','block');
                                });
                        }
                    });
        };

        this.isEnabled = function() {
            if (typeof(check) === 'function') return check();
            return true;
        };

        this.deactivate = function() {
            ctrl.isActive = false;

            d3.select('#'+ id)
                .style('opacity', 0.5);

            if (ctrl.hasScreen)
                d3.select('#'+ id +'Screen')
                    .style('display','none');
        };

        var ctrl = this;
    };


    VIZ.toolbox = function() {
        if (VIZ.image) return;

        VIZ.canvas.append('g')
            .attr('id','screens')
            .attr('transform','translate('+ [VIZ.margin.left, VIZ.margin.top] +')');

        var utils = VIZ.canvas.append('g')
            .attr('class','utils')
            .attr('transform','translate('+ [window.innerWidth -150, 6] +') scale(1)');

        utils.selectAll('.butt')
            .data(VIZ.conf['toolbox']).enter()
                .append('g')
                    .attr('class','butt')
                    .attr('id', function(d){ return d; })
                    .attr('transform',
                        function(d,i) {
                            return 'translate('+ [i*18, 0] +')';
                        });

        VIZ.conf['toolbox'].map(
            function(i) {
                if (!VIZ[i +'CTRL'])
                    VIZ[i +'CTRL'] = new VIZ.Control(i);
                VIZ[i +'CTRL'].render();
            });
    };


    window.VIZ = VIZ;
})(window);
