
import os
import sys
import json
import redis
import request

sys.path.append('%s/projects/viz/nbclient' % os.getenv('HOME'))
import validate
import transform

sys.path.append('%s/project/utilities/python' % os.getenv('HOME'))
import config
cnf = config.LocalCnf()


def stream(id):
    '''
    stream dynamic data-source
    '''
    red = redis.StrictRedis(host='localhost',
                            port=cnf.get('NODE_REDIS_PORT'),
                            password=cnf.get('NODE_REDIS_PASS'),
                            charset='utf-8', decode_responses=True)

    meta = json.loads(red.get('viz-meta/%s' % id))
    source = request.get(meta['source'])
    data = json.loads(source)
    data = transform.filters(data, meta)
    meta['summary'] = transform.summary(data, meta)
    print(json.dumps({ 'data':data, 'meta':meta }))


def main():
    stream(sys.argv[1])


if  __name__ =='__main__':
    main()
