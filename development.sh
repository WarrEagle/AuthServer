#!/bin/bash
forever stop $PWD/src/jwtpay.js
export NODE_ENV=development
forever start -a -l $PWD/log/jwtpay/log.txt -o $PWD/log/jwtpay/out.txt -e $PWD/log/jwtpay/err.txt -w --watchDirectory $PWD/src $PWD/src/jwtpay.js
