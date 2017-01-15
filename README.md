
# Interactive Visualization ( D3 ) in Jupyter Notebook

This project is integrated with <a href="https://github.com/arcta/server-setup">Data-Science R&amp;D on Ubuntu</a> and comes as a part of a server setup. Main focus on the data exploration process itself; identifying scenarios where interactivity has actual advantage for finding insights. Main objective is support for interactive visuals embedded in the notebook with ability to save insights as deep-links.

While in development contents are stored in redis; when the notebook published all included visuals compiled and stored in the file-system, s3/gc bucket, memcache, etc.

Supported data sources:
* static ( json )
* dynamic ( url end-point )
* stream ( pubsub channel )

Dynamic & stream are intended for monitoring and saving static (data) snapshots for insights.


```python
# use local file system to store compiled visuals
from viz import local
viz = local.VizNotebook('http://192.168.1.145:4006')
```


```python
import numpy
import pandas
from datetime import datetime 
from time import time

# generate some data
df = pandas.DataFrame(numpy.random.randn(1000, 3), columns=list('ABC'))
df['B'] = df['B'].apply(lambda b: 1 + 1000*abs(b))
df['C'] = df['A'].apply(lambda a: 1000*a*a) - df['B']
df.head()
```


```python
df.describe()
```


```python
import json

# data format: dictionary per observation

### flaten pivot table to get required json format
# df = pandas.DataFrame(df.to_records())

### keep the index
# data = df.reset_index().to_json(orient='records')

data = df.to_json(orient='records')
print(json.loads(data)[0])
```


```python
viz.summary(data, height=350)
```


```python
viz.static(data, type='matrix', height=350, width='95%',
           x='A',
           y='B',
           colormap=['lightgray','red'],
           zbins=4)
```


```python
viz.static(data, type='matrix', height=350, width='95%',
           x='A',
           y='B',
           z='C',
           colormap=['teal','crimson'],
           zbins=4)
```


```python
viz.static(data, type='scatter', height=350, width='95%',
           x='A',
           y='B',
           z='C',
           colormap=['teal','crimson'])
```


```python
# dynamic data source
df = pandas.read_json('http://192.168.1.145:4004/sample/100')
df.head()
```


```python
# loads current data on access
viz.dynamic('http://192.168.1.145:4004/sample/100', type='area', height=350, width='100%',
            x='D',
            y=['B','F'],
            mode='wiggle',
            title='Area-Chart ( data loads on access )')
```


```python
# use redis pubsub to stream data
from viz import pubsub
viz = pubsub.VizNotebook('http://192.168.1.145:4006')
```


```python
# listens to pubsub messages channel `sample-io`
viz.stream('http://192.168.1.107:4017/sample-io', type='line', height=350, width='100%',
            x='D',
            y=['A','B','E'],
            title='Line-Chart ( data appended as arrived )',
            interpolate='Basis',
            mode='normalized',
            xformat='%H:%M:%S')
```

With non-static data Marker tool creates static data snapshots.

More examples @ <a href="http://www.arcta.me/projects/viz/">Project-Home</a>:
* <a href="http://www.arcta.me/projects/viz/examples/matrix/index.html">Matrix</a>
* <a href="http://www.arcta.me/projects/viz/examples/scatter/index.html">Scatter</a>
* <a href="http://www.arcta.me/projects/viz/examples/line/index.html">Timeseries</a>
* <a href="http://www.arcta.me/projects/viz/examples/area/index.html">Area</a>


```python
# compile static resources and save in destination
viz.publish(path_publish='projects/viz/app/static', path_notebook='projects/viz/README')
```

#### Run in Docker Container 

To run viz-server in a docker container:
<pre>
docker run --name latest -d redis
docker build -t node .
docker run -d --name node -P --link latest:redis node
docker ps -a # grab the reference

CONTAINER ID        IMAGE             PORTS                     NAMES
c98a1501864a        node              0.0.0.0:32771->4000/tcp   node
092d5174a9a7        redis             6379/tcp                  latest
</pre>


```python
from viz import local
viz = local.VizNotebook('http://0.0.0.0:32771')
```


```python

```
