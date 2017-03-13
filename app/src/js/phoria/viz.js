(function(window) {
    'use strict';

    var scene,
        canvas,
        requestAnimFrame =  window.requestAnimationFrame ||
                            window.webkitRequestAnimationFrame ||
                            window.mozRequestAnimationFrame ||
                            window.msRequestAnimationFrame ||
                            function(c) {window.setTimeout(c, 15)};

    var VIZ = window.VIZ || {};

    function generateGrid(d, segs, scale) {
    /******************************************************************
     * adaptation of Phoria.Util.generateTesselatedPlane
     ******************************************************************/
        var points = [], edges = [], polys = [],
            inc = scale/segs, c = 0;

        for (var i = 0, d1,d2 = scale/2; i <= segs; i++) {
            d1 = -scale/2;
            for (var j = 0; j <= segs; j++) {
                p = { x:0, y:0, z:0 };
                p[d[0]] = d1; p[d[1]] = d2;
                points.push(p);

                if (j !== 0) {
                    edges.push( {a:c, b:c-1} );
                }
                if (i !== 0) {
                    edges.push( {a:c, b:c-segs-1} );
                }

                if (i !== 0 && j !== 0) {
                    var p = {vertices:[c-segs-1, c, c-1, c-segs-2]};
                    polys.push(p);
                }

                d1 += inc;
                c++;
            }
            d2 -= inc;
        }

        return {
            points: points,
            edges: edges,
            polygons: polys
        };
    }

    function hexToRGB(h) {
        if (h.charAt(0) == "#") h = h.substring(1,7);
        return [parseInt(h.substring(0,2),16), parseInt(h.substring(2,4),16), parseInt(h.substring(4,6),16)];
    }

    function hslToRGB(h, s, l) {
        var r, g, b;

        if(s == 0) {
            r = g = b = l;

        } else {
            var hue2rgb = function hue2rgb(p, q, t){
                if(t < 0) t += 1;
                if(t > 1) t -= 1;
                if(t < 1/6) return p + (q - p) * 6 * t;
                if(t < 1/2) return q;
                if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            }

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    function sformat(A) {
        var s = [];
        A.map(function(a){ s.push(a.toExponential(3)); });
        return s.join(', ');
    }

    VIZ.phoria = function() {
        canvas = document.getElementById('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        scene = new Phoria.Scene();
        scene.camera.position = { x:0, y:0, z:-30.0 };
        scene.perspective.aspect = canvas.width / canvas.height;
        scene.viewport.width = canvas.width;
        scene.viewport.height = canvas.height;

        var renderer = new Phoria.CanvasRenderer(canvas);

        var S = VIZ.meta.summary, D = VIZ.data, amp = VIZ.meta.grid || 1, colormap = {},
            C = [(S.x.domain[0] + S.x.domain[1])/2, (S.y.domain[0] + S.y.domain[1])/2, (S.z.domain[0] + S.z.domain[1])/2,]

        if ('colormap' in VIZ.meta) {
            for (var c in VIZ.meta.colormap) colormap[c] = hexToRGB(VIZ.meta.colormap[c]);

        } else if (VIZ.meta.seg) {
            S.seg.domain.map(function(s,i){ colormap[s] = hslToRGB(i/S.seg.domain.length, 0.5, 0.5); });
        }

        var generateGraph = function(seg, i) {
            var points = [], edges = [],
                c = !seg ? [0,0,0] : colormap[seg];

            D.map(function(d,i) {
                if (!seg || d['seg'] === seg) {
                    var p = {};
                    ['x','y','z'].map(function(a,j){ p[a] = 5 * ((d[a] - C[j])/S[a].domain[1]); });
                    points.push(p);
                    if (i > 0) edges.push({ a:i-1, b:i });
                }
            });

            return Phoria.Entity.create({
                points: points,
                edges: edges,
                style: {
                    color: c,
                    drawmode: VIZ.meta.mode === 'line' ? 'wireframe':'point',
                    shademode:'plain',
                    linewidth: VIZ.meta['stroke'] || 2,
                    linescale: 1,
                    objectsortmode:'back'
                }
            });
        };

        var graph = new Phoria.Entity();
        if (VIZ.meta.seg) S.seg.domain.map(function(s,i){ graph.children.push(generateGraph(s,i)); });
        else graph.children.push(generateGraph(false));

        if (!!VIZ.meta.grid) {
            ['x','y','z'].map(function(d,i) {
                var g = VIZ.meta.grid || 10,
                    plane = generateGrid('xyz'.replace(d,'').split(''), g, 10);

                var grid = Phoria.Entity.create({
                    points: plane.points,
                    edges: plane.edges,
                    polygons: plane.polygons,
                    style: {
                        color: [i === 0 ? 200 : 0, i === 1 ? 200 : 0, i === 2 ? 200 : 0],
                        drawmode:'wireframe',
                        shademode:'plain',
                        linewidth: 0.15,
                        objectsortmode:'back'
                    }
                });
                graph.children.push(grid);
            });
        }

        scene.graph.push(graph);

        Phoria.Entity.debug(graph, {
            showAxis: !!VIZ.meta.axes
        });

        var rotate = 'rotate' in VIZ.meta ? VIZ.meta.rotate : true,
            mouse = rotate ? false : Phoria.View.addMouseEvents(canvas);

        var rot = {
            x: 0, y: 0, z: 0,
            velx: 0, vely: 0, velz: 0,
            nowx: 0, nowy: 0, nowz: 0,
            ratio: 0.1
        };

        var pause = false;
        var fnAnimate = function() {
            if (!mouse) {
                graph.rotateY(Phoria.RADIANS * rot.ratio).rotateX(Phoria.RADIANS * rot.ratio).rotateZ(Phoria.RADIANS * rot.ratio);

            } else {
                rot.nowx += (rot.velx = (mouse.velocityV - rot.x - rot.nowx) * rot.ratio);
                rot.nowy += (rot.vely = (rot.y - rot.nowy) * rot.ratio);
                rot.nowz += (rot.velz = (mouse.velocityH - rot.z - rot.nowz) * rot.ratio);
                graph.rotateX(-rot.velx*Phoria.RADIANS).rotateY(-rot.vely*Phoria.RADIANS).rotateZ(-rot.velz*Phoria.RADIANS);
            }
            scene.modelView();
            renderer.render(scene);

            requestAnimFrame(fnAnimate);
        };

        document.addEventListener('keydown', function(e) {
            switch (e.keyCode) {
                case 27: // ESC to interactive mouse-driven rotation
                    if (!mouse) {
                        rot = {
                            x: 0, y: 0, z: 0,
                            velx: Phoria.RADIANS * rot.ratio, vely: Phoria.RADIANS * rot.ratio, velz: Phoria.RADIANS * rot.ratio,
                            nowx: 0, nowy: 0, nowz: 0,
                            ratio: 0.1
                        };
                        mouse = Phoria.View.addMouseEvents(canvas);
                    }
                    break;
            }
        }, false);

        document.getElementById('title').innerHTML  = VIZ.meta.title;

        document.getElementById('xaxis').innerHTML = 'X: ['+ (VIZ.meta.xlabel || VIZ.meta.x)
            +'] domain ['+ sformat(S.x.domain) +'] grid: '+ sformat([(S.x.domain[1] - S.x.domain[0])/5]);

        document.getElementById('yaxis').innerHTML = 'Y: ['+ (VIZ.meta.ylabel || VIZ.meta.y)
            +'] domain ['+ sformat(S.y.domain) +'] grid: '+ sformat([(S.y.domain[1] - S.y.domain[0])/5]);

        document.getElementById('zaxis').innerHTML = 'Z: ['+ (VIZ.meta.zlabel || VIZ.meta.z)
            +'] domain ['+ sformat(S.z.domain) +'] grid: '+ sformat([(S.z.domain[1] - S.z.domain[0])/5]);

        document.getElementById('origin').innerHTML = 'O: ['+ sformat(C) +']';

        document.getElementById('tooltip').innerHTML = rotate ? '( Hit Esc key to switch to interactive rotation. )':'( Use mouse-drag to rotate the view. )';

        if (VIZ.meta.seg) {
            S.seg.domain.map(function(s,i) {
                var div = document.createElement('div'),
                    icon = document.createElement('span'),
                    content = document.createTextNode(s);

                icon.style.background = 'rgb('+ colormap[s].join(',') +')';
                div.appendChild(icon);
                div.appendChild(content);
                document.getElementById('colormap').appendChild(div);
            });
        }

        requestAnimFrame(fnAnimate);
    };

    window.VIZ = VIZ;

})(window);
