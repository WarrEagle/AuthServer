
var requester = require('./NVPRequester').NVPRequester
, url = require('url')
;

function PaypalExpressCheckout(settings) {
	//console.log(settings);
	this.requester = new requester(settings.queryParams, settings.mode);
	this.baseURL = this.defaults.baseURL[settings.mode];
	this.pathname = this.defaults.pathname;
	
}

PaypalExpressCheckout.prototype.defaults = {
	baseURL: {
		production: 'www.paypal.com'
		, development: 'www.sandbox.paypal.com'
	}
	, pathname: '/cgi-bin/webscr'
};


PaypalExpressCheckout.prototype.initializeCheckout = function SetExpressCheckout(queryParams, cb) {
	
	var self = this;
	
	queryParams.method = 'SetExpressCheckout';
	
	//console.log('[SetExpressCheckout] Params: ', JSON.stringify(queryParams, null, 2));
	
	self.requester.request(queryParams, function(err, resp) {
		
		if(err) {
			//console.error('initializeCheckout[ERROR]', err);
			return cb(err);
		}
		
		if(resp.ACK === 'Failure') {
			//console.error('initializeCheckout[Failure]', resp.L_LONGMESSAGE0, resp);
			return cb(resp.L_LONGMESSAGE0, resp);
		}
		
		if(resp.ACK === 'Success') {
			
			var formatted = self.formatInitializeCheckoutResponse(resp);
			formatted.redirect = url.format({
        protocol: 'https:'
        , host: self.baseURL
        , pathname: '/cgi-bin/webscr'
        , query: {
          cmd: '_express-checkout',
          token: resp.TOKEN
        }
      });
			//console.log('initializeCheckout[Success]', formatted);
			return cb(null, formatted);
		}
		
		return cb(new Error('Unknown ACK: ' + resp.ACK), resp);
		
	});
	
};

PaypalExpressCheckout.prototype.getCheckoutDetails = function GetExpressCheckoutDetails(queryParams, cb) {
	
	var self = this;
	
	queryParams.method = 'GetExpressCheckoutDetails';
	
	//console.log('[getCheckoutDetails] Params: ', JSON.stringify(queryParams, null, 2));
	
	self.requester.request(queryParams, function(err, resp) {
		
		if(err) {
			//console.error('getCheckoutDetails[ERROR]', err);
			return cb(err);
		}
		
		if(resp.ACK === 'Failure') {
			//console.error('getCheckoutDetails[Failure]', resp.L_LONGMESSAGE0, resp);
			return cb(resp.L_LONGMESSAGE0, resp);
		}
		
		if(resp.ACK === 'Success') {
			var formatted = self.formatCheckoutResponse(resp);
			//console.log('getCheckoutDetails[Success]', formatted);
			return cb(null, formatted);
		}
		
		return cb(new Error('Unknown ACK: ' + resp.ACK), resp);
	});
	
};

PaypalExpressCheckout.prototype.commitCheckout = function DoExpressCheckoutPayment(queryParams, cb) {
	
	var self = this;
	
	queryParams.method = 'DoExpressCheckoutPayment';
	
	//console.log('[DoExpressCheckoutPayment] Params: ', JSON.stringify(queryParams, null, 2));
	
	self.requester.request(queryParams, function(err, resp) {
		
		if(err) {
			//console.error('commitCheckout[ERROR]', err);
			return cb(err);
		}
		
		if(resp.ACK === 'Failure') {
			//console.error('commitCheckout[Failure]', resp.L_LONGMESSAGE0, resp);
			return cb(resp.L_LONGMESSAGE0, resp);
		}
		
		if(resp.ACK === 'Success') {
			var formatted = self.formatCheckoutCommitResponse(resp);
			//console.log('commitCheckout[Success]', formatted);
			return cb(null, formatted);
		}
		
		return cb(new Error('Unknown ACK: ' + resp.ACK), resp);
	});
	
};

PaypalExpressCheckout.prototype.formatCheckoutResponse = function formatCheckoutResponse(resp) {
	return {
				buyerInfo: {
					email: resp.EMAIL
				}
				, payerInfo: {
					id: resp.PAYERID
					, payerStatus: resp.PAYERSTATUS
					, firstname: resp.FIRSTNAME
					, lastname: resp.LASTNAME
					, countryCode: resp.COUNTRYCODE
					, business: resp.BUSINESS
					, address: {
						name: resp.PAYMENTINFO_0_SHIPTONAME
						, street: resp.PAYMENTINFO_0_SHIPTOSTREET
						, city: resp.PAYMENTINFO_0_SHIPTOCITY
						, state: resp.PAYMENTINFO_0_SHIPTOSTATE
						, countryCode: resp.PAYMENTINFO_0_SHIPTOCOUNTRYCODE
						, countryName: resp.PAYMENTINFO_0_SHIPTOCOUNTRYNAME
						, zip: resp.PAYMENTINFO_0_SHIPTOZIP
						, id: resp.PAYMENTINFO_0_ADDRESSID
						, status: resp.PAYMENTINFO_0_ADDRESSSTATUS
					}
				}
				, transactionInfo: {
					timestamp: resp.TIMESTAMP
					, correlationId: resp.CORRELATIONID
					, ack: resp.ACK
					, version: resp.VERSION
					, build: resp.BUILD
					, token: resp.TOKEN
				}
		};
};

PaypalExpressCheckout.prototype.formatCheckoutCommitResponse = function formatCheckoutCommitResponse(resp) {
	return {
				transaction: {
					id: resp.PAYMENTINFO_0_TRANSACTIONID
					, type: resp.PAYMENTINFO_0_TRANSACTIONTYPE
					, paymentType: resp.PAYMENTINFO_0_PAYMENTTYPE
					, orderTime: resp.PAYMENTINFO_0_ORDERTIME
					, amount: resp.PAYMENTINFO_0_AMT
					, currencyCode: resp.PAYMENTINFO_0_CURRENCYCODE
					, taxAmount: resp.PAYMENTINFO_0_TAXAMT
					, paymentStatus: resp.PAYMENTINFO_0_PAYMENTSTATUS
					, pendingReason: resp.PAYMENTINFO_0_PENDINGREASON
					, reasonCode: resp.PAYMENTINFO_0_REASONCODE
				}
				, transactionInfo: {
					timestamp: resp.TIMESTAMP
					, correlationId: resp.CORRELATIONID
					, ack: resp.ACK
					, version: resp.VERSION
					, build: resp.BUILD
					, token: resp.TOKEN
				}
		};
};

PaypalExpressCheckout.prototype.formatInitializeCheckoutResponse = function formatInitializeCheckoutResponse(resp) {
	return {
				transactionInfo: {
					timestamp: resp.TIMESTAMP
					, correlationId: resp.CORRELATIONID
					, ack: resp.ACK
					, version: resp.VERSION
					, build: resp.BUILD
					, token: resp.TOKEN
				}
		};
};

exports.PaypalExpressCheckout = PaypalExpressCheckout;
