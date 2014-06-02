var express           	= require('express');
var expressValidator  	= require('express-validator');
var hbs               	= require('hbs');
var jselect           	= require('JSONSelect');
//var jw               	= require('jwt-simple');
var mongoose          	= require('mongoose');
var nodemailer        	= require("nodemailer");
var redis             	= require('redis');
var RedisStore        	= require('connect-redis')(express);
var rest              	= require('restler');
var _                 	= require('underscore');
var depRegistrar      	= require('./registrars/dependencyRegistrar');
var google           	= require('./lib/google');
var settings         	= require('./lib/settings');
var loggerService    	= require('./services/logger').create(settings.app.logging);;
var async 	      	= require('async');

mongoose.connect(settings.app.db);
var User	      	= require('./lib/models/User.js');
var App     	      	= require('./lib/models/App.js');
var Checkout 	      	= require('./lib/models/Checkout.js');
var Purchase 	      	= require('./lib/models/Purchase.js');
var createId 	      	= require('./lib/models').createId;

var app = module.exports = express();
var GoogleStrategy 	= require('passport-google-oauth').OAuth2Strategy;;
var FacebookStrategy 	= require('passport-facebook').Strategy;
var passport 		= require('passport');
var paypal 		= require('./lib/paypal');

paypal.init(settings.paypal);

var paymentGateways = {
	'google': function(user, app, purchaseKey, cb) {
		initCheckoutWithGoogle(user, app, purchaseKey, cb);
	}
	, 'paypal': function(user, app, purchaseKey, cb) {
		initCheckoutWithPaypal(user, app, purchaseKey, cb); 
	}
};

var transport = nodemailer.createTransport(
  'SMTP', 
  {
    service: 'Gmail',
    //host: 'kickasschromeapps.com',	
    //secureConnection: true,
    //port: 587 ,
    auth: {
      user: 'misoquale@gmail.com',
      pass: '67life4me'
    }
  }
);

hbs.registerHelper('isNotGoogleCheckout', function(name, options) {
	if (name !== 'google') {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
}); 


process.on('uncaughtException', function (err) {
  app.logger.fatal('UNCAUGHT EXCEPTION', [err]);

  if (process.env.NODE_ENV == 'production') {
    transport.sendMail({
      from: 'postman@kickasschromeapps.com',
      to: settings.app.email,
      subject: 'KickassAuth Payment Uncaught Exception',
      text: 'Error: ' + err.toString()
    });
  }
});

depRegistrar.register(app, settings);

loggerService.clearLoggers();
loggerService.addLogger(settings.app.logging.enabled[0]);
var accessLogger = loggerService.getLoggers()[0];

app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set("view options", { layout: false });
  app.set('view engine', 'hbs');
  app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
  app.use(express.bodyParser({ uploadDir: __dirname + '/uploads' }));
  app.use(expressValidator);
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(express.session({
    secret: 'some secret',
    store: new RedisStore,
    cookie: {
      maxAge: 1000 * 60 * 10//10 minutes
    }
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  if (settings.app.logging.accessLogs) {
    app.use(express.logger({
      immediate: true,
      format: ':req[remote-addr] - - [:date] ":method :url HTTP/:http-version" :status :res[Content-Length] ":referrer" ":user-agent"',
      stream: accessLogger
    }));
  }
});

app.configure('development', function () {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
  app.use(express.errorHandler());
});

function view(obj) {
  _.defaults(
    obj,
    {
      cache: true,
      compile: true,
      locals: { }
    }
  );
 
  return obj;
}

app.get('/', function (req, res) {
  res.send('Nothing to see here.');
}); 

app.get('/postauth', function (req, res) {
  if(typeof(req.session.passport.user) !== 'undefined'){
	app.logger.info('Saved email: ' + req.session.passport.user.email);
	//console.log('req.session.passport.user: %s', JSON.stringify(req.session.passport.user, null, 2));
	//console.log('req.user: %s', JSON.stringify(req.user, null, 2));
	//console.log('SESSION INSPECTION AT POST AUTH: %s', JSON.stringify(req.session, null, 2));
    res.redirect('/buy/' + req.session.appId + '?purchaseKey=' + req.session.purchaseKey);

  }else{
    res.redirect('/auth/providers');
  }
});

// Necessary passport helper function to serialize users
passport.serializeUser(function(user, done) {
   done(null, user);
});

// Necessary passport helper function to deserialize users
passport.deserializeUser(function(obj, done) {
   done(null, obj);
});


function getUser(email, provider, profileId, cb) {
	var q = {
		email : email
	};
	q[provider + '.email'] = profileId;
	User.findOne(q).exec(cb);
}

function createUser(provider, email, profileId, accessToken, cb) {

	var user = {
		email : email,
		login : provider + ":" + profileId
	};

	user[provider] = {
		email : profileId,
		accessToken : accessToken
	};

	var newUser = new User(user);
	newUser.save(function(err) {
		if (err) {
			return cb(err);
		}
		var date = new Date(newUser._id.getTimestamp());
		app.logger.info('NEW USER CREATED'); 
		return cb(null, newUser);
	});

}

function updateAccessToken(provider, user, token, profileId, cb) {

	User.updateToken(user.email, provider, token, profileId, cb);

}

var createUserWithGoogleInfo = createUser.bind(this, 'google');
var createUserWithFacebookInfo = createUser.bind(this, 'facebook');

var updateGoogleAccessToken = updateAccessToken.bind(this, 'google');
var updateFacebookAccessToken = updateAccessToken.bind(this, 'facebook');

passport.use(new GoogleStrategy({
	clientID: settings.google.appId,
 	clientSecret: settings.google.appSecret,
 	callbackURL: settings.google.callbackURI
}, function(accessToken, refreshToken, profile, done) {
	process.nextTick(function() {
		var newUserEmail = "";
		if (profile.emails.length) {
			newUserEmail = profile.emails[0].value;
		}
		getUser(newUserEmail, 'google', profile.id, function(err, user) {
			if (err) {
				return done(err);
			}

			if (!user) {
				return createUserWithGoogleInfo(newUserEmail, profile.id, accessToken, function(err, u) {
					done(err, u);
				});
			}

			return updateGoogleAccessToken(user, accessToken, profile.id, function(err) {
				done(err, user);
			});

		});
	});
}));

passport.use(new FacebookStrategy({
	clientID : settings.facebook.appId,
	clientSecret : settings.facebook.appSecret,
	callbackURL : settings.facebook.callbackURI
}, function(accessToken, refreshToken, profile, done) {
	//done(null, profile);
	var newUserEmail = "";
	if(typeof(profile.emails)!=='undefined'){
		if (profile.emails.length) {
			newUserEmail = profile.emails[0].value;
	}
	}
	else {
		newUserEmail = profile.id;
	}
	getUser(newUserEmail, 'facebook', profile.id, function(err, user) {
		if (err) {
			return done(err);
		}

		if (!user) {
			return createUserWithFacebookInfo(newUserEmail, profile.id, accessToken, done);
		}

		return updateFacebookAccessToken(user, accessToken, profile.id, done);

	});
})); 


app.get('/auth/google/callback', 
   passport.authenticate('google', { failureRedirect: '/auth/providers' }),
   function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/postauth');
});

app.get('/auth/google',
   passport.authenticate('google', { scope: 
      ['https://www.googleapis.com/auth/userinfo.profile',
       'https://www.googleapis.com/auth/userinfo.email'] }
));

app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email'} ));

app.get('/auth/facebook/callback', 
   passport.authenticate('facebook', { failureRedirect: '/auth/providers' }),
   function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/postauth');
});

app.get('/auth/providers', function(req, res) {
	//console.log('SESSION INSPECTION PRE AUTH: %s', JSON.stringify(req.session, null, 2));
	res.render('oauthProviders', {
		providers: [{
			name: 'google'
			, title: 'Google+'
			, path: '/auth/google'
		}
		, {
			name: 'facebook'
			, title: 'Facebook'
			, path: '/auth/facebook'
		}]
	})
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/checkout/paymentConfirmed', function(req, res) {
	var tmpldata = {payerName: req.session.payerName, transaction: req.session.transaction};
	res.render('paymentConfirmed', tmpldata);
});

app.get('/initCheckout/:paymentGateway', function(req, res) {
	
	var gateway = paymentGateways[req.params.paymentGateway]
	, purchaseKey = req.session.purchaseKey
	, appId = req.session.appId
	, user = req.session.passport.user
	;

	if(!gateway) {
		return res.send(404);
	}
	getAppById(appId, function(err, app) {
		if(err || !app) {
			return respondError(err ? 'Error while fetching app from db' : 'No app found!', req, res, err);
		}
		gateway(user, app, purchaseKey, function(err, resp) {
			if (err) {
				return res.send({ success : false, error : err });
			}
			res.redirect(resp.redirect);
		});		
	});
});

function getAppById(appId, cb) {
	App.findById(appId, function(err, app) {
		cb(err, app);
	});
}

function getPurchase(profileId, appId, cb) {
	
	var q = {
    googleId: profileId,
    app: appId
 	};
 	
	Purchase.find(q, null, {skip: 0, limit: 1, sort: {created: -1}}, function(err, purchases) {
		
		if(!purchases) {
			purchases = [];
		}
		
		cb(err, purchases[0]);
		
	});
	
}

function purchaseToRevalidate(purchase, purchaseKey, cb) {
	purchase.purchaseKey = purchaseKey;
	purchase.mode = 'Revalidate';
	purchase.save(cb);
}

function initCheckoutWithPaypal(user, app, purchaseKey, cb) {
	
	var orderId = createId()
	, price = app.price
	, email = user.email
	, description = app.purchaseMsg

	paypal.create(email, orderId, app, function(err, order, redirectURL) {
		if(err) {
			return cb(err);
		}
		insertNewPurchase(user, app._id.toString(), purchaseKey, order.paymentId, orderId);
		cb(null, {redirect: redirectURL});
	});
}


function initCheckoutWithGoogle(user, app, purchaseKey, cb) {
	google.checkout(__dirname + '/lib/google/checkout.xml', {
		app : app,
		purchaseKey : purchaseKey,
		userId : user._id,
		googleId : getProfileId(user)
	}, cb);
}

function getProfileId(user) {
	if(!_.isEmpty(user.google)) {
		return user.google.email;
	}
	return user.facebook.email;
}

function respondError(reason, req, res, err) {
	console.error('IP: %s, Reason: %s, Error Object: %s', req.ip, reason, JSON.stringify(err, null, 2));
	res.render('error', view({ layout: false }));
}

app.get('/' + settings.paypal.returnPath, function(req, res) {
	
	var orderId = req.query.orderId
	, payerId = req.query.PayerID
	;
	
	Purchase.findOne({
		orderId: orderId
	}, function(err, purchase) {
		
		if(err) {
			return respondError('Error while looking for purchase', req, res, err);
		}
		
		paypal.execute(purchase.orderNumber, payerId, function(err, state, dateTime, payer, transaction) {
			
			if(err) {
				return respondError('Error while executing paypal purchase', req, res, err);
			}
			req.session.transaction = transaction;
			req.session.payerName = payer.info.firstName;
			req.session.save(function() {
				markPurchaseAsComplete(purchase.orderNumber);
				res.redirect('/checkout/paymentConfirmed');				
			});
		});
		
	});
	
});

app.get('/buy/:id', function (req, res) {
	
  var purchaseKey = req.query.purchaseKey
  , user = req.session.passport.user
  ;
	
  if (!req.isAuthenticated()) {
    req.session.appId = req.params.id;
    req.session.purchaseKey = purchaseKey;
    return req.session.save(function() {
			return res.redirect('/auth/providers');    	
    });
  }
  
  async.waterfall([getAppById.bind(this, req.session.appId)
	  , function(app, cb) {
	  	if(!app) {
	  		return cb({message: 'APP_NOT_FOUND'});
	  	}
	  	getPurchase(getProfileId(user), app._id, function(err, purchase) {
	  		if(err) {
	  			return cb({message: 'ERROR_IN_FETCHING_PURCHASE'})
	  		}
	  		cb(err, app, purchase);
	  	});
	  }
	  , function(app, purchase, cb) {
	  	if(!purchase) {
	  		return cb({message: 'PURCHASE_NOT_FOUND'});
	  	}
	  	if(purchase.status === 'COMPLETE') {
	  		return cb({message: 'PURCHASE_ALREADY_COMPLETE', purchase: purchase, app: app});
	  	}
	  	return cb({message: 'PURCHASE_NOT_YET_COMPLETE'});
	  }]
	  , function(err) {
	  	if( (err && !err.message) || err.message === 'APP_NOT_FOUND' || err.message === 'ERROR_IN_FETCHING_PURCHASE') {
	  		return respondError(err.message ? err.message : 'Error while fetching app from db', req, res, err);
	  	}
	  	if(err.message === 'PURCHASE_ALREADY_COMPLETE') {
	  		return purchaseToRevalidate(err.purchase, purchaseKey, function() {
	  			req.logout(); // reset login session for security
          app.logger.info('Revalidated User: PurchaseKey: ' + purchaseKey );
          return res.render( 'revalidate', view({ layout: false, app: err.app }));
	  		});
	  	}
	  	if(err.message === 'PURCHASE_NOT_FOUND' || err.message === 'PURCHASE_NOT_YET_COMPLETE') {
				return res.redirect('/payment/gateways');	  		
	  	}
	  });
});

app.get('/payment/gateways', function(req, res) {
	getAppById(req.session.appId, function(err, app) {
		if(err || !app) {
			return respondError(err ? 'Error while fetching app from db' : 'No app found!', req, res, err);
		}
		res.render('paymentOptions', {paymentOptions: settings.paymentOptions, isGoogleUser: true, app: app});
	});
});

app.get('/purchase/check/:key', function (req, res) {
  Purchase
    .findOne({
      purchaseKey: req.params.key,
      status: 'COMPLETE'
    })
    .populate('app')
    .exec(function (err, purchase) {
    	
      if (err) {
        return res.send({
          success: false
        });
      }

      if (!purchase || purchase.status !== 'COMPLETE') {
        return res.send({
          success: true,
          purchased: false
        });
      }

      res.send({
        success: true,
        purchased: true,
        includes: purchase.app.includes
      });
    });
});

function insertNewPurchase(user, appId, purchaseKey, token, orderId) {
	app.logger.info('NEW ORDER', token); 
	var p = {
    orderNumber:  token,
    app:          appId,
    purchaseKey:  purchaseKey,
    user:        user._id,
    googleId:     getProfileId(user),
    status:       'PENDING',
    orderId: orderId || createId()
 	};
  var purchase = new Purchase(p);
  purchase.save();
}


function markPurchaseAsComplete(token) {
	Purchase.findOne({
		orderNumber : token
	}).populate('app').exec(function(err, purchase) {
		if (err) {
			app.logger.error('Could not fetch purchase:', err);
			return;
		}

		if (!purchase) {
			app.logger.error('PURCHASE NOT FOUND: ' + token);
			return;
		}

		purchase.status = 'COMPLETE';
		purchase.save();

		transport.sendMail({
			from : 'postman@kickasschromeapps.com',
			to : settings.app.email,
			subject : 'KickassAuth New ' + purchase.app.language + ' Order: ' + token,
			text : JSON.stringify(purchase)
		});
		app.logger.info('NEW ORDER COMPLETE', token); 
    
    // Find all pending orders and remove them
    Purchase.find({
      purchaseKey:  purchase.purchaseKey,
      status:       'PENDING'
    }).populate('app').exec(function(err, list) {
      if (err) {
        app.logger.error('Could not fetch purchase:', err);
        return;
      }
      
      // No pending orders found then return
      ìf (!list || list.length === 0)
        return;
      
      // Remove pending orders
      var i = 0;
      for (i = 0; i < list.length;) {
        list[i].remove();
        i = i + 1;
      }
      
      app.logger.info('Removed ' + list.length + ' PENDING Orders for User-PurchaseKey: ' + purchase.purchaseKey);
    });

	});
}


app.post('/google/notify', function (req, res) {
  google.handleNotification(
    req,
    res,
    function (serial, xml) {
      var checkout = new Checkout({
        serial: serial,
        xml: xml
      });
      checkout.save();
    },
    function (err, details) {
    	
      if (details.merchantData.length > 0) {
        app.logger.info('NEW ORDER', details.orderNumber); 

        var merchantData = details.merchantData[0];

        var purchase = new Purchase({
          orderNumber:  details.orderNumber,
          app:          merchantData.appId,
          purchaseKey:  merchantData.purchaseKey,
          user:         merchantData.userId,
          googleId:     merchantData.googleId,
          status:       'PENDING' 
        });
        purchase.save();

      } else if (details.orderStateData) {
        app.logger.info('ORDER STATE of ' + details.orderNumber + ' changed to ' + details.orderStateData['new-fulfillment-order-state'] + ' + ' + details.orderStateData['new-financial-order-state']);

        if (details.orderStateData['new-fulfillment-order-state'] === 'DELIVERED') {
        	markPurchaseAsComplete(details.orderNumber);
        }

      } else if (details.riskNotification) {
        app.logger.info('RISK notification received for', details.orderNumber);
      }
    }
  );
});

var port = process.argv[2] || 3000;

if (process.env.NODE_ENV == 'production') {
  transport.sendMail({
    from: 'postman@kickasschromeapps.com',
    to: settings.app.email,
    subject: 'KickassAuth Starting up daemon. Port ' + port,
    text: 'Just a friendly notice.'
  });
}

app.listen(port);
app.logger.info('Express server listening on port ' + port + ' in ' + (process.env.NODE_ENV ? process.env.NODE_ENV : 'development') + ' mode');
