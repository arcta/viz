#!/usr/bin/env

def check(args, meta):
    '''
    check if all requied arguments are in
    '''
    if 'width' not in args:
        args['width'] = '100%'
    if 'height' not in args:
        args['height'] = 500

    for key in list(meta.keys()):
        prefix = meta[key][:7]
        if key not in args:
            if prefix == 'REQUIRE':
                raise KeyError('Missing REQUIRED argument: %s [ %s ]' % (key, meta[key][10:]))
            if prefix == 'DEFAULT':
                del(meta[key])
        else:
            meta[key] = args[key]

    for key in args:
        if key not in meta:
            print('Warning: `%s` is not present in META and might be ignored' % key)
            meta[key] = args[key]

    return meta


def main():
    print(check({ 'x':1, 'z':2 },{ 'x':'REQUIRED: independent variable lablel','a':'system arg' }))
    print(check({ 'x':1 },{ 'y':'REQUIRED: dependent variable lablel' }))


if  __name__ =='__main__':
    main()
