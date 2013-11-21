var https = require('https')
, querystring = require('querystring')
, _ = require('underscore')
;

function NVPRequester(queryParams, mode) {
	
	this.settings = this.parseParams(queryParams, mode);
	
	this.baseURL = this.defaults.baseURL[mode];
	
}

NVPRequester.prototype.defaults = {
	baseURL: {
		production: 'api-3t.paypal.com'
		, development: 'api-3t.sandbox.paypal.com'
	}
	, queryParams: {
		VERSION: '94.0'
		, PAYMENTREQUEST_0_PAYMENTACTION: 'Sale'			
	}
	, queryParamNameMap: {
		username: 'USER'
		, password: 'PWD'
		, signature: 'SIGNATURE'
		, version: 'VERSION'
		, paymentAction: 'PAYMENTREQUEST_0_PAYMENTACTION'
		, amount: 'PAYMENTREQUEST_0_AMT'
		, returnURL: 'RETURNURL'
		, cancelURL: 'CANCELURL'
		, method: 'METHOD'
		, token: 'TOKEN'
		, payerId: 'PAYERID'
	}
};

NVPRequester.prototype.request = function request(queryParams, callback) {
	
	var settings = _.extend({}, this.settings, this.normalizeParams(queryParams))
	, options = {
		host : this.baseURL
		, path : '/nvp?' + querystring.stringify(settings)
		, method: 'GET'
	};
	
	//console.log('Requesting with options: ', JSON.stringify(options, null, 2));
	
	var req = https.get(options, function(res) {
    var data = '';

    res.on('data', function(d) {
      data = data + d;
    });

    res.on('end', function() {
    	var resp = querystring.parse(data.toString());
    	//console.log(settings.METHOD + ' response: ', JSON.stringify(resp, null, 2));
      callback(null, resp);
    });
  });
  
  req.on('error', function(e) {
    callback(e);
  });

};

NVPRequester.prototype.parseParams = function parseParams(queryParams) {

	return _.extend({}, this.defaults.queryParams, this.normalizeParams(queryParams));
	
};


NVPRequester.prototype.normalizeParams = function normalizeParams(queryParams) {
	
	var qp = {}
	, queryParamNameMap = this.defaults.queryParamNameMap
	;
	
	for(var key in queryParams) {
		
		if(queryParams.hasOwnProperty(key)) {
			
			var k = queryParamNameMap[key]
			;
			
			if(k) {
				qp[k] = queryParams[key];				
			}
			
		}
		
	}
	
	return qp;
	
};

exports.NVPRequester = NVPRequester;


