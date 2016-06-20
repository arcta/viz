
import os
import sys
import json
import time

from IPython.display import IFrame

sys.path.append('/'.join(__file__.split('/')[:-1]))
import validate
import transform
import request

sys.path.append('%s/project/utilities/python' % '/'.join(__file__.split('/')[:-4]))
import config
cnf = config.LocalCnf()

import redis
red = redis.StrictRedis(password=cnf.get('NODE_REDIS_PASS'), port=cnf.get('NODE_REDIS_PORT'))
pubsub = red.pubsub()


def host():
    return 'http://%s:%s' % (cnf.get('NODEIP'), cnf.get('NODE_PROJECT_VIZ_PORT'))


def iframe(ref, source, args):
    response = request.post('%s/%s' % (host(), ref), data=json.dumps({ 'data':source, 'meta':args }))
    response = json.loads(response)
    if 'id' in response:
        return IFrame('%s/%s/%s' % (host(), ref, response['id']), width=args['width'], height=args['height'])
    raise Exception('API communication issue: host[ %s ] status [ %s ] ' % (host(), response['status']))


def static(data, **kwargs):
    '''
    Call from Jupyter notebook to create/update visualization
    which will be saved on the server and retrieved with http request
    '''
    args = json.loads(request.get('%s/meta/%s' % (host(), kwargs['type'])))
    args['static'] = True
    for arg in kwargs:
        args[arg] = kwargs[arg]
    args = validate.check(args)

    data = json.loads(data)
    data = transform.filters(data, args)
    if 'summary' in args: args['switch'] = args['summary']
    args['summary'] = transform.summary(data, args)
    return iframe('static', data, args)


def dynamic(url, **kwargs):
    '''
    Call from Jupyter notebook to create/update visualization
    with dynamic data-source defined by url end-poin
    '''
    args = json.loads(request.get('%s/meta/%s' % (host(), kwargs['type'])))
    args['dynamic'] = True
    args['source'] = url
    for arg in kwargs:
        args[arg] = kwargs[arg]
    args = validate.check(args)

    source = request.get(url)
    data = json.loads(source)
    data = transform.filters(data, args)
    if 'summary' in args: args['switch'] = args['summary']
    args['summary'] = transform.summary(data, args)
    return iframe('stream', source, args)


def stream(channel, **kwargs):
    '''
    Call from Jupyter notebook to create/update visualization
    streaming data-source channel
    '''
    args = json.loads(request.get('%s/meta/%s' % (host(), kwargs['type'])))
    args['stream'] = True
    args['source'] = channel
    for arg in kwargs:
        args[arg] = kwargs[arg]
    args = validate.check(args)

    pubsub.subscribe(channel)
    for message in pubsub.listen():
        if message['type'] == 'message':
            data = json.loads(message['data'].decode())
            if 'x' not in args:
                args['x'] = 'TIMESTAMP'
                data['TIMESTAMP'] = time.time()
            data = transform.filters([data], args)
            args['summary'] = transform.summary(data, args)
            return iframe('stream', channel, args)


def main():
    print(cnf.get('NODEIP'))


if  __name__ =='__main__':
    main()
