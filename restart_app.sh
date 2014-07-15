#!/bin/bash

#forever restart 0

export NODE_ENV=production
forever -w --watchDirectory /opt/kickass/src /opt/kickass/src/jwtpay.js >> /opt/kickass/log/jwtpay/jwtpay.log 2>&1 &
