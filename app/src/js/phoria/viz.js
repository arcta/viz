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

    VIZ.phoria = function() {
        canvas = document.getElementById('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        scene = new Phoria.Scene();
        scene.camera.position = { x:0, y:0, z:-30.0 };
        scene.camera.lookat = { x:0, y:0, z:0 };
        scene.perspective.fov = 33;
        scene.perspective.aspect = canvas.width / canvas.height;
        scene.viewport.width = canvas.width;
        scene.viewport.height = canvas.height;

        var rotation = 0.0;
        scene.onCamera(function(position, lookAt, up) {
            var rotMatrix = mat4.create();
            mat4.rotateY(rotMatrix, rotMatrix, rotation);
            mat4.rotateX(rotMatrix, rotMatrix, rotation);
            rotation -= 0.001;
            vec4.transformMat4(position, position, rotMatrix);
        });

        var renderer = new Phoria.CanvasRenderer(canvas);

        var S = VIZ.meta.summary, D = VIZ.data,
            C = [(S.x.domain[0] + S.x.domain[1])/2, (S.y.domain[0] + S.y.domain[1])/2, (S.z.domain[0] + S.z.domain[1])/2,]

        var generateGraph = function() {
            var edges = [];
            D.map(function(d,i) {
                ['x','y','z'].map(function(a,j){ D[i][a] = 5 * ((d[a] - C[j])/S[a].domain[1]); });
                if (i > 0) edges.push({ a:i-1, b:i });
            });

            return Phoria.Entity.create({
                points: D,
                edges: edges,
                style: {
                    color: [0,0,0],
                    drawmode:'wireframe',
                    shademode:'plain',
                    linewidth: 2,
                    linescale: 1,
                    objectsortmode:'back'
                }
            });
        };

        ['X','Y','Z'].map(function(d,i) {
            var plane = Phoria.Util.generateTesselatedPlane(10,10,0,10);

            var grid = Phoria.Entity.create({
                points: plane.points,
                edges: plane.edges,
                polygons: plane.polygons,
                style: {
                    color: [i === 0 ? 200 : 0, i === 1 ? 200 : 0, i === 2 ? 200 : 0],
                    drawmode:'wireframe',
                    shademode:'plain',
                    linewidth: 0.25,
                    objectsortmode:'back'
                }
            });
            grid['rotate'+ d](Math.PI/2);
            scene.graph.push(grid);
        });

        var grph = generateGraph();
        scene.graph.push(grph);

        var pause = false;
        var fnAnimate = function() {
            if (!pause) {
                scene.modelView();
                renderer.render(scene);
            }
            requestAnimFrame(fnAnimate);
        };

        document.addEventListener('keydown', function(e) {
            switch (e.keyCode) {
                case 27: // ESC
                    pause = !pause;
                    break;
            }
        }, false);

        document.getElementById('title').innerHTML  = VIZ.meta.title;
        document.getElementById('xaxis').innerHTML  = 'X: ['+ (VIZ.meta.xlabel || VIZ.meta.x) +'] domain ['+ S.x.domain +'] grid: '+ (S.x.domain[1] - S.x.domain[0])/5;
        document.getElementById('yaxis').innerHTML  = 'Y: ['+ (VIZ.meta.ylabel || VIZ.meta.y) +'] domain ['+ S.y.domain +'] grid: '+ (S.y.domain[1] - S.y.domain[0])/5;
        document.getElementById('zaxis').innerHTML  = 'Z: ['+ (VIZ.meta.zlabel || VIZ.meta.z) +'] domain ['+ S.z.domain +'] grid: '+ (S.z.domain[1] - S.z.domain[0])/5;
        document.getElementById('origin').innerHTML = 'O: ['+ C +']';

        requestAnimFrame(fnAnimate);
    };

    window.VIZ = VIZ;

})(window);

