
import sys
import json
import numpy
import time
from dateutil.parser import parse


def filters(data, meta):
    filtered = []

    if 'y' in meta: ykey = meta['y']

    if 'y' in meta and isinstance(meta['y'], (list, tuple)):
        ylabel = meta['ylabel'] if 'ylabel' in meta else 'y'
        zlabel = meta['zlabel'] if 'zlabel' in meta else 'z'
        z = list(meta['y'])
        keys = [k for k in data[0].keys() if k not in z]
        reshaped = []
        for d in data:
            for l in z:
                f = {}
                for k in keys: f[k] = d[k]
                f[ylabel] = d[l]
                f[zlabel] = l
                reshaped.append(f)
        data = reshaped
        ykey = ylabel
        meta['z'] = zlabel
        meta['switch'] = False

    for d in data:
        f = {}

        if 'x' in meta:
            f['x'] = d[meta['x']]

        if 'y' in meta:
            f['y'] = d[ykey]

        if 'z' in meta:
            f['z'] = d[meta['z']]

        filtered.append(f)

    return filtered


def summary(data, meta):
    stats = {}

    for label in data[0]:
        stats[label] = {}

        types = {
            'categorical': 0,
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
                types['ordinal'] += 1.1
                values.append(data[i][label])

            elif isdate(data[i][label]):
                types['date'] += 1
                values.append(time.mktime(parse(str(data[i][label])).timetuple()))

            else:
                types['categorical'] += 1

            if str(data[i][label]) not in hist:
                hist[str(data[i][label])] = 0
            hist[str(data[i][label])] += 1

        stats[label]['missing'] = missing
        stats[label]['type'] = max(types, key = types.get)

        if 'ordinal' == stats[label]['type'] and values != sorted(values):
            stats[label]['type'] = 'numeric'

        if stats[label]['type'] == 'numeric' and len(values) > 0:
            stats[label]['quartiles'] = numpy.percentile(values, numpy.arange(0, 100, 25)).tolist()[1:]
            stats[label]['mean'] = float(numpy.mean(values))
            stats[label]['std'] = float(numpy.std(values))

        elif stats[label]['type'] != 'numeric':
            check = '%sord' % label
            if check in meta:
                stats[label]['domain'] = meta[check]
            else:
                stats[label]['domain'] = sorted(list(hist.keys()))

            if stats[label]['type'] == 'categorical':
                check = '%sdomain' % label
                if check in meta:
                    stats[label]['hist'] = [(hist[l] if l in hist else 0) for l in meta[check]]
                    stats[label]['domain'] = meta[check]
                else:
                    stats[label]['hist'] = [hist[l] for l in stats[label]['domain']]

        if len(values) > 0:
            values = sorted(values)
            stats[label]['range'] = [values[0], values[-1]]
            stats[label]['domain'] = stats[label]['range']

        check = '%slim' % label
        if check in meta:
            if stats[label]['type'] == 'date':
                stats[label]['domain'] = []
                stats[label]['domain'].append(time.mktime(parse(str(meta[check][0])).timetuple()))
                stats[label]['domain'].append(time.mktime(parse(str(meta[check][1])).timetuple()))
            else:
                stats[label]['domain'] = meta[check]

        if stats[label]['type'] == 'date':
            for i in range(len(data)):
                data[i][label] = time.mktime(parse(str(data[i][label])).timetuple())

        if meta[label] == 'TIMESTAMP':
            stats[label]['type'] = 'date'
            #window = meta['window'] if 'window' in meta else 60
            #stats[label]['domain'][0] = [stats[label]['domain'][0] - window]
            stats[label]['domain'] = None

    return stats


def isdate(s):
    try: parse(str(s))
    except ValueError: return False
    else: return True


def main():
    print(summary(json.loads(sys.argv[1]),json.loads(sys.argv[2])))


if  __name__ =='__main__':
    main()
