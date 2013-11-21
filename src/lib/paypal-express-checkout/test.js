var index = require('./index');
var requester = new index.requester({
	username: 'tamilvendhan.k_api1.gmail.com'
	, password: '1374438866'
	, signature: 'A7oSNbPH-D6iwnpLi5j0BniDBrj9AHPE-zPLykG.NerT68nqk2XMGAC6'
	, version: '94.0'
}, 'development');
var PaypalExpressCheckout = index.PaypalExpressCheckout;
var paypalExpressCheckout = new PaypalExpressCheckout(require('../settings').paypal);
paypalExpressCheckout.initializeCheckout({ amount : '5.99', paymentAction: 'Sale' }, function(err, resp) {
				
				if(err) {
					return console.error(resp);
				}
				
				console.log(resp);
				
			}); 
