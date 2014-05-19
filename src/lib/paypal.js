var paypal = require('paypal-rest-sdk')
, conf
;

exports.init = function(config) {
	conf = config;
	paypal.configure(config.api);
};

exports.create = function(email, orderId, app, cb) {
	
	
	var paypalPayment = {
		'intent' : conf.intent,
		'payer' : {
			'payment_method' : conf.method
		},
		'redirect_urls' : {
			'return_url' : 'http://' + conf.host + ':' + (conf.port ? conf.port : 3000) + '/' + conf.returnPath + '?orderId=' + orderId,
			'cancel_url' : 'http://' + conf.host + ':' + (conf.port ? conf.port : 3000) + '/' + conf.cancelPath + '?status=cancel&orderId' + orderId
		},
		'transactions' : [{
			'item_list' : {
				'items' : [{
					'name' : app.name + ' - ' + app.description,
					//	'sku' : 'PP-' + app._id.toString(),
					'price' : app.price,
					'currency' : conf.currency,
					'quantity' : 1,
					//'description' : app.description
				}]
			},
			'amount' : {
				'currency' : conf.currency,
				'total' : app.price
			},
			'description' : app.description
		}]
	};
	//console.log(paypalPayment);

	paypal.payment.create(paypalPayment, {}, function(err, resp) {
		
		if (err) {
			console.log(err);
			return cb({
				message : [{
					desc : 'Payment API call failed',
					type : 'error'
				}]
			});
		}
		//console.log('PAYPAL CREATE RESP: %s', JSON.stringify(resp, null, 2));
		var now = (new Date()).toISOString().replace(/\.[\d]{3}Z$/, 'Z ')
		, order = {
			orderId: orderId
			, email: email
			, paymentId: resp.id
			, paymentState: resp.state
			, amount: app.price
			, description: app.description
			, dateTime: now
		}
		, redirectUrl
		;
		
		var link = resp.links;
		for (var i = 0; i < link.length; i++) {
			if (link[i].rel === 'approval_url') {
				redirectUrl = link[i].href;
				break;
			}
		}
		
		cb(null, order, redirectUrl);
		
	});
	
};

exports.execute = function(paymentId, payerId, cb) {
	//console.log(paymentId, {payer_id: payerId});
	paypal.payment.execute(paymentId, {payer_id: payerId}, {}, function(err, resp) {
		if (err) {
			console.log(err);
			return cb({
				message : [{
					desc : 'execute payment API failed',
					type : 'error'
				}]
			});
		}
		//console.log('PAYPAL EXECUTE RESP: %s', JSON.stringify(resp, null, 2));
		var transaction = resp.transactions[0]
		, t = {
			id: resp.id
			, type: conf.intent
			, paymentType: ''
			, orderTime: resp.create_time
			, amount: transaction.amount.total
			, currencyCode: transaction.amount.currency
			, taxAmount: transaction.amount.details.tax
			, paymentStatus: resp.state
		}
		, payer = {
			method: resp.payer.payment_method
			, info: {
				email: resp.payer.payer_info.email
				, firstName: resp.payer.payer_info.first_name
				, lastName: resp.payer.payer_info.last_name
				, id: resp.payer.payer_info.payer_id
			}
		}
		;
		cb(null, resp.state, resp.create_time, payer, t);
	});
};
