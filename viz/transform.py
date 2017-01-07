#!/usr/bin/env

import sys
import json
import math
import numpy
import time

from dateutil.parser import parse
from datetime import datetime



def isdate(s):
    '''
    guess date from the strins
    '''
    try: parse(str(s))
    except ValueError: return False
    else: return True



def jstimestamp(t):
    '''
    JS timestamp is milliseconds vs UNIX (python) seconds
    '''
    return 1e3 * time.mktime(parse(str(t)).timetuple())



def filters(data, meta):
    '''
    filter in only fields requested in meta
    transform to canonical X,Y,Z
    '''
    filtered = []
    Z = ('z' in meta)
    V = { 'x':meta['x'], 'y':meta['y'] }

    for a in V.keys():
        if a in meta:
            if isinstance(meta[a], (list, tuple)):
                s = '%slabel' % a
                label = meta[s] if s in meta else a
                z = list(meta[a])
                keys = [k for k in data[0].keys() if k not in z]

                Z = (len(z) > 1)
                if Z: zlabel = meta['zlabel'] if 'zlabel' in meta else 'z'
                else: zlabel = z[0]

                reshaped = []
                for d in data:
                    for l in z:
                        D = {}
                        for k in keys: D[k] = d[k]
                        D[label] = d[l]
                        if Z: D[zlabel] = l
                        reshaped.append(D)
                data = reshaped
                V[a] = label

                if Z: meta['z'] = zlabel
                meta['switch'] = False

    for d in data:
        D = {}
        if 'x' in meta: D['x'] = d[V['x']]
        if 'y' in meta: D['y'] = d[V['y']]
        if 'z' in meta: D['z'] = d[meta['z']]
        filtered.append(D)

    return filtered



def nhist(v, stats):
    '''
    normalzed histogram for summary-plot
    '''
    normalized = list(map(lambda x: math.floor(4*(x - stats['mean'])/stats['std']), v))
    unique, counts = numpy.unique(normalized, return_counts=True)
    return list(zip(unique, counts))



def summary(data, meta):
    '''
    generate statistical summary
    '''
    stats = {}

    for label in data[0]:
        stats[label] = {}

        types = {
            'categoric': 0,
            'ordinal': 0,
            'numeric': 0,
            'date': 0
        }
        missing = 0
        hist = {}
        values = []

        for i in range(len(data)):
            if None == data[i][label]:
                missing += 1

            elif isinstance(data[i][label], float):
                types['numeric'] += 1
                values.append(data[i][label])

            elif isinstance(data[i][label], int):
                types['numeric'] += 1
                # soft guess towards ordinal
                types['ordinal'] += 1.1
                values.append(data[i][label])

            elif isdate(data[i][label]):
                types['date'] += 1
                values.append(jstimestamp(data[i][label]))

            else:
                types['categoric'] += 1

            if str(data[i][label]) not in hist:
                hist[str(data[i][label])] = 0
            hist[str(data[i][label])] += 1

        stats[label]['missing'] = missing
        stats[label]['type'] = max(types, key = types.get)

        if 'ordinal' == stats[label]['type'] and values != sorted(values):
            stats[label]['type'] = 'numeric'

        if stats[label]['type'] == 'numeric' and len(values) > 0:
            stats[label]['mean'] = float(numpy.mean(values))
            stats[label]['std'] = float(numpy.std(values))
            if meta['type'] == 'summary':
                stats[label]['bins'] = nhist(values, stats[label])

        elif stats[label]['type'] != 'numeric':
            check = '%sord' % label
            if check in meta:
                stats[label]['domain'] = meta[check]
            else:
                stats[label]['domain'] = sorted(list(hist.keys()))

            if stats[label]['type'] == 'categoric':
                check = '%sdomain' % label
                if check in meta:
                    stats[label]['hist'] = [(hist[l] if l in hist else 0) for l in meta[check]]
                    stats[label]['domain'] = meta[check]
                else:
                    stats[label]['hist'] = [hist[l] for l in stats[label]['domain']]

        if len(values) > 0:
            values = sorted(values)
            stats[label]['domain'] = [values[0], values[-1]]

        check = '%slim' % label
        if check in meta:
            if stats[label]['type'] == 'date':
                stats[label]['domain'] = []
                stats[label]['domain'].append(jstimestamp(meta[check][0]))
                stats[label]['domain'].append(jstimestamp(meta[check][1]))
            else:
                stats[label]['domain'] = meta[check]

        if stats[label]['type'] == 'date':
            for i in range(len(data)):
                data[i][label] = jstimestamp(data[i][label])

        if label in meta and meta[label] == 'TIMESTAMP':
            stats[label]['type'] = 'date'
            stats[label]['domain'] = None

        if meta['flow'] == 'stream' and stats[label]['type'] == 'date':
            meta['window'] = meta['window']*1e3 if 'window' in meta else 6e4
            current = time.time() * 1e3
            stats[label]['domain'] = [current-meta['window'], current]

    return stats



def extract(meta, target):
    '''
    data for summary plot
    '''
    data = []
    X0 = 1
    X1 = -1
    Y = 0
    Z = []
    if target == 'numeric':
        meta['interpolate'] = 'Basis'
        meta['x'] = 'x'
        meta['xlabel'] = 'StD. Units centered @ Mean'
        meta['y'] = 'y'
        meta['title'] = 'Numeric Values Distribution'
        meta['mode'] = 'normalized'
        meta['z'] = 'z'
        meta['zformat'] = '.4f'
        meta['ctrl'] = ['absolute','normalized']
        meta['labels'] = {}
        meta['colormap'] = { 'Normal Distribution':'lightgray' }
        Z.append('Normal Distribution')
        for label in list(meta['summary']):
            if meta['summary'][label]['type'] == 'numeric':
                X0 = min(X0, float(meta['summary'][label]['bins'][0][0]/4))
                X1 = max(X1, float(meta['summary'][label]['bins'][-1][0]/4))
                Z.append(label)
                meta['labels'][label] = '%s\nMean: %.4f\nStD: %.4f\nMin: %.4f\nMax: %.4f' % (
                                label,
                                meta['summary'][label]['mean'],
                                meta['summary'][label]['std'],
                                meta['summary'][label]['domain'][0],
                                meta['summary'][label]['domain'][1])

                for i in range(len(meta['summary'][label]['bins'])):
                    data.append({
                        'x':float(meta['summary'][label]['bins'][i][0]/4),
                        'y':int(meta['summary'][label]['bins'][i][1]),
                        'z':label })
                    Y = max(Y, int(meta['summary'][label]['bins'][i][1]))
                del(meta['summary'][label]['bins'])

            else:
                del(meta['summary'][label])
        x = X0
        e = 1.0 / math.sqrt(2 * math.pi)
        while x <= X1:
            data.append({
                'x': x,
                'y': e * math.exp(-0.5 * x * x),
                'z':'Normal Distribution' })
            x += 0.25

        meta['summary']['x'] = { 'type':'numeric', 'domain':[X0,X1] }
        meta['summary']['y'] = { 'type':'numeric', 'domain':[0,Y] }
        meta['summary']['z'] = { 'type':'categoric', 'domain':Z }

    elif target == 'categoric':
        pass

    return data, meta



def main():
    test = numpy.random.rand(100, 3)
    data = []
    for i in range(len(test)):
        d = {}
        d["A"] = test[i][0]
        d["B"] = 1 + int(1000*abs(test[i][1]))
        d["C"] = test[i][2] + 100 * d["A"] - 0.1 * d["B"]
        d["D"] = datetime.fromtimestamp(time.time() - 43*i).strftime('%Y-%m-%d %H:%M:%S')
        d["E"] = ['red','blue','yellow','green','purple','orange','lime'][int(round(6 * d["A"]))]
        data.append(d)

    print(summary(data, json.loads('{"x":"D","y":"E","z":"C"}')))
    print(summary(data, json.loads('{"x":"D","y":["E","A"]}')))
    print(summary(data, json.loads('{}')))

    test = '[{"D":"2016-12-02 21:29:57","C":"blue","E":129.2762446398,"A":-1.2364313351,"B":236},{"D":"2016-12-02 21:29:14","C":"blue","E":76.3645010512,"A":-1.2769671141,"B":867}]'
    print(filters(json.loads(test), json.loads('{"x":"D","y":"E","z":"C"}')))
    print(filters(json.loads(test), json.loads('{"x":"D","y":["E","A"]}')))

    print(isdate('kjhgiuyt 456 876/4/345 987:98:54'))
    print(isdate('tomorrow'))
    print(isdate('March 16 2016'))
    print(isdate('05:30:55 PM'))



if  __name__ =='__main__':
    main()
