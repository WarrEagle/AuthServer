var http                = require('http');
var express             = require('express');
var expressValidator    = require('express-validator');
var hbs                 = require('hbs');
var mongoose            = require('mongoose');
var nodemailer          = require("nodemailer");
var redis               = require('redis');
var RedisStore          = require('connect-redis')(express);
var rest                = require('restler');
var _                   = require('underscore');
var depRegistrar        = require('./registrars/dependencyRegistrar');
var google              = require('./lib/google');
var settings            = require('./lib/settings');
var loggerService       = require('./services/logger').create(settings.app.logging);
var async               = require('async');

mongoose.connect(settings.app.db);
var User                = require('./lib/models/User.js');
var App                 = require('./lib/models/App.js');
var Checkout            = require('./lib/models/Checkout.js');
var Purchase            = require('./lib/models/Purchase.js');
var createId            = require('./lib/models').createId;

var app = module.exports = express();
var GoogleStrategy      = require('passport-google-oauth').OAuth2Strategy;
var FacebookStrategy    = require('passport-facebook').Strategy;
var passport            = require('passport');
var paypal              = require('./lib/paypal');
var tco                 = require('./lib/2checkout');
var FB                  = require('fb');


paypal.init(settings.paypal);
tco.init(settings.tco);
var paymentGateways = {
  'paypal': function(billinfo, user, appObj, purchaseKey, cb) {
    initCheckoutWithPaypal(billinfo, user, appObj, purchaseKey, cb); 
  },
  '2checkout': function(billinfo, user, appObj, purchaseKey, cb){
    initCheckoutWith2Checkout(billinfo, user, appObj, purchaseKey, cb);
  }
};


var transport;
if (settings.app.emailNotify) {
  transport = nodemailer.createTransport(
    'SMTP', 
    {
      host: 'kickasschromeapps.com',
      secureConnection: false,
      port: 25,
      auth: {
        user: 'no-reply@kickasschromeapps.com',
        pass: 'getin2it'
      }
    }
  );
}


function SendMailWithRetry(subject, content, retriesLeft) {
  transport.sendMail({
    from: 'no-reply@kickasschromeapps.com',
    to: settings.app.email,
    subject: '[' + settings.app.emailSubject + '] ' + subject,
    text: content
  }, function(error, response){
    if(error){
      app.logger.error('Could not send email for: ' + subject + '\n[Err] ' + JSON.stringify(error, ['stack', 'message', 'inner'], 2));
      if( retriesLeft > 0 ) {
        setImmediate(function(){
          app.logger.info('Retry sending email for: ' + subject);
          SendMailWithRetry(subject, content, retriesLeft-1);
        });
      }
    }else{
      app.logger.info('Email sent for: ' + subject);
    }
  });
}


hbs.registerHelper('isNotGoogleCheckout', function(name, options) {
  if (name !== 'google') {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
}); 


process.on('uncaughtException', function (err) {
  app.logger.fatal('UNCAUGHT EXCEPTION', [err]);

  if (settings.app.emailNotify) {
    var subject = 'Uncaught Exception';
    var text = 'Error: ' + JSON.stringify(err, ['stack', 'message', 'inner'], 2);
    SendMailWithRetry(subject, text, 3);
  }
});


depRegistrar.register(app, settings);
loggerService.clearLoggers();
loggerService.addLogger(settings.app.logging.enabled[0]);
var accessLogger = loggerService.getLoggers()[0];

app.configure(function () {
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback'); // get client ip on nginx proxy
  app.set('views', __dirname + '/views');
  app.set("view options", { layout: false });
  app.set('view engine', 'hbs');
  app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
  app.use(express.bodyParser({ uploadDir: __dirname + '/uploads' }));
  app.use(expressValidator);
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  if (process.env.NODE_ENV === "production") {
    // only use Redis on production
    app.use(express.session({
      secret: 'some secret',
      store: new RedisStore(),
      cookie: {
        maxAge: 1000 * 60 * 30//30 minutes
      }
    }));
  } else {
    app.use(express.session({
      secret: 'some secret',
      cookie: {
        maxAge: 1000 * 60 * 30//30 minutes
      }
    }));
  }
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


function ensureAuthenticated(req, res, next, authProvider, errorHandler) {
  if( req.isAuthenticated() ) {
    if( !authProvider || req.session.passport.user[authProvider] ) {
      return next();
    } else {
      return errorHandler(req, res);
    }
  } else {
    return errorHandler(req, res);
  }
}


function ensureAuthenticatedPage(req, res, next) {
  return ensureAuthenticated(req, res, next, null, function(req, res) {
    res.redirect('/auth/providers');
  });
}


function ensureAuthenticatedApi(req, res, next) {
  return ensureAuthenticated(req, res, next, null, function(req, res) {
    res.send({success: false, loggedIn: false});
  });
}


function ensureAuthenticatedFacebookPage(req, res, next) {
  return ensureAuthenticated(req, res, next, 'facebook', function(req, res) {
    res.redirect('/fb/login');
  });
}


function ensureAuthenticatedFacebookApi(req, res, next) {
  return ensureAuthenticated(req, res, next, 'facebook', function(req, res) {
    res.send({success: false, loggedIn: false});
  });
}


function ensureSession(req, res, next, errorHandler) {
  // check appId
  if( !req.session.appId ) {
    if( req.params && req.params.id ) req.session.appId = req.params.id;
    if( req.query && req.query.appId ) req.session.appId = req.query.appId;
    if( !req.session.appId ) return errorHandler(req, res);
  }
  // check purchaseKey
  if( !req.session.purchaseKey ) {
    if( req.params && req.params.key ) req.session.purchaseKey = req.params.key;
    if( req.query && req.query.purchaseKey ) req.session.purchaseKey = req.query.purchaseKey;
    if( !req.session.purchaseKey ) return errorHandler(req, res);
  }
  // from
  if( !req.session.from ) req.session.from = 'buy';
  // get app from appId
  req.session.save(function() {
    if( !req.session.app ) {
      App.findById(req.session.appId, function(err, result) {
        if (err || !result) {
          return errorHandler(req, res);
        }
        req.session.app = result;
        req.session.save(function() {
          next();
        });
      });
    } else {
        next();
    }
  });
}


function ensureSessionPage(req, res, next) {
  return ensureSession(req, res, next, function(req, res) {
    respondError(req.session.appId ? 'Missing session values' : 'No app found!', req, res, null);
  });
}


function ensureSessionApi(req, res, next) {
  return ensureSession(req, res, next, function(req, res) {
    res.send({success: false, error: 'No app found!'});
  });
}


app.get('/', function (req, res) {
  res.send('Nothing to see here.');
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


function createUser(provider, email, profile, accessToken, cb) {

  var profileId = profile.id;
  var displayName = profile.displayName;
  var user = {
    name  : displayName,
    email : email,
    login : provider + ":" + profileId
  };

  // additional profile info
  if( profile.gender ) user.gender = profile.gender;

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
    app.logger.info('NEW USER CREATED: ' + email); 
    return cb(null, newUser);
  });

}
var createUserWithGoogleInfo = createUser.bind(this, 'google');
var createUserWithFacebookInfo = createUser.bind(this, 'facebook');


function updateAccessToken(provider, user, token, profile, cb) {
  User.updateToken(user.email, provider, token, profile, cb);
}
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
        return createUserWithGoogleInfo(newUserEmail, profile, accessToken, function(err, u) {
          done(err, u);
        });
      }

      return updateGoogleAccessToken(user, accessToken, profile, function(err) {
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
      return createUserWithFacebookInfo(newUserEmail, profile, accessToken, done);
    }

    return updateFacebookAccessToken(user, accessToken, profile, done);

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


app.get('/auth/facebook', passport.authenticate('facebook', { display: 'popup', scope: ['email', 'user_friends'] } ));
app.get('/auth/facebook/callback', 
   passport.authenticate('facebook', { failureRedirect: '/auth/providers' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/postauth');
});


app.get('/auth/providers', function(req, res) {
  //console.log('SESSION INSPECTION PRE AUTH: %s', JSON.stringify(req.session, null, 2));
  if( req.session.from === 'chrome' ){
    req.session.from = 'buy';
    req.session.save(function() {
      res.render('fbLoginCallback');
    });
  } else {
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
    });
  }
});


app.get('/postauth', ensureAuthenticatedPage, ensureSessionPage, function (req, res) {
  //console.log('req.session.passport.user: %s', JSON.stringify(req.session.passport.user, null, 2));
  //console.log('req.user: %s', JSON.stringify(req.user, null, 2));
  //console.log('SESSION INSPECTION AT POST AUTH: %s', JSON.stringify(req.session, null, 2));
  app.logger.info('Saved email: ' + req.session.passport.user.email);
  if( req.session.from === 'chrome' ){
    req.session.from = 'buy';
    req.session.save(function() {
      res.render('fbLoginCallback');
    });
  } else {
    res.redirect('/buy/' + req.session.appId + '?purchaseKey=' + req.session.purchaseKey);
  }
});


app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


app.get('/debug', function(req, res){
  if (!settings.app.showDebugInfo) {
    res.send({status: "ok"});
  } else {
    res.send({isAuthenticated: req.isAuthenticated(), user: req.user, session: req.session, headers: req.headers});
  }
});


app.get('/checkout/paymentConfirmed', function(req, res) {
  var tmpldata = {payerName: req.session.payerName, transaction: req.session.transaction};
  res.render('paymentConfirmed', tmpldata);
});


app.get('/initCheckout/:paymentGateway', ensureAuthenticatedPage, ensureSessionPage, function(req, res) {
  
  var gateway = paymentGateways[req.params.paymentGateway]
  , purchaseKey = req.session.purchaseKey
  , appObj = req.session.app
  , user = req.session.passport.user
  ;

  if(!gateway) {
    return res.send(404);
  }

  var billinfo = {};
  if( user.name ) billinfo.name = user.name;
  if( user.email ) billinfo.email = user.email;
  if( req.headers['x-geoip-city'] ) billinfo.city = req.headers['x-geoip-city'];
  if( req.headers['x-geoip-country-code3'] ) billinfo.country_code = req.headers['x-geoip-country-code3'];
  
  gateway(billinfo, user, appObj, purchaseKey, function(err, resp) {
    if (err) {
      return respondError('Error while init ' + gateway + ' checkout.', req, res, err);
    }
    res.redirect(resp.redirect);
  });
});


function getAppById(appId, cb) {
  App.findById(appId, function(err, appObj) {
    cb(err, appObj);
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


function getProfileId(user) {
  if(!_.isEmpty(user.google)) {
    return user.google.email;
  }
  return user.facebook.email;
}


function respondError(reason, req, res, err) {
  app.logger.error('Reason: ' + reason + '\n[Req] ' + JSON.stringify(req, ['ip', 'originalUrl', 'headers', 'session'], 2) + '\n[Err] ' + JSON.stringify(err, ['stack', 'message', 'inner'], 2));
  res.render('error', view({ layout: false }));
}


function initCheckoutWith2Checkout(billinfo, user, appObj, purchaseKey, cb){
  var orderId = createId();
  var paymentId = "TCO-" + orderId.toUpperCase();
  insertNewPurchase(user, appObj._id.toString(), purchaseKey, paymentId, orderId);
  tco.create(billinfo, orderId, appObj, function(err, link){
    cb(null,{redirect: link});
  });
}


function completeCheckoutWith2CO(req, res){
  var data = null;
  if (req.query && req.query.merchant_order_id)
    data = req.query; // GET:req.query
  else if (req.body && req.body.merchant_order_id)
    data = req.body; // POST:req.body
  if (data && tco.validate(data)){
    var orderId = data.merchant_order_id;
    Purchase.findOne({
      orderId: orderId
    }).populate('app').exec(function(err, purchase) {
      if(err || !purchase){
        return respondError('Error while looking for purchase', req, res, err);
      }
      tco.execute(data, purchase.orderNumber, function(err, payer, transaction){
        if(err){
          return respondError('Error while executing 2checkout purchase', req, res, err);
        }
        req.session.transaction = transaction;
        req.session.payerName = payer.info.firstName;
        req.session.save(function() {
          markPurchaseAsComplete(purchase.orderNumber);
          res.redirect('/checkout/paymentConfirmed');        
        });
      });
    });
  } else {
    return respondError('Invalid 2checkout payment.', req, res, err);
  }
}
app.get ('/' + settings.tco.returnPath, completeCheckoutWith2CO);
app.post('/' + settings.tco.returnPath, completeCheckoutWith2CO);


function initCheckoutWithPaypal(billinfo, user, appObj, purchaseKey, cb) {
  
  var orderId = createId()
  , price = appObj.price
  , email = user.email
  , description = appObj.purchaseMsg;

  paypal.create(email, orderId, appObj, function(err, order, redirectURL) {
    if(err) {
      return cb(err);
    }
    insertNewPurchase(user, appObj._id.toString(), purchaseKey, order.paymentId, orderId);
    cb(null, {redirect: redirectURL});
  });
}


app.get('/' + settings.paypal.returnPath, function(req, res) {
  
  var orderId = req.query.orderId
  , payerId = req.query.PayerID
  ;
  
  Purchase.findOne({
    orderId: orderId
  }).populate('app').exec(function(err, purchase) {
    
    if(err || !purchase){
      return respondError('Error while looking for purchase', req, res, err);
    }
    
    paypal.execute(purchase.orderNumber, payerId, function(err, state, dateTime, payer, transaction){
      if(err){
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


app.get('/buy/:id', ensureSessionPage, ensureAuthenticatedPage, function (req, res) {
  // This is the API for invite app, save session before validate authentication
  
  var purchaseKey = req.session.purchaseKey
  , user = req.session.passport.user
  ;
  
  async.waterfall([getAppById.bind(this, req.session.appId)
    , function(appObj, cb) {
      if(!appObj) {
        return cb({message: 'APP_NOT_FOUND'});
      }
      getPurchase(getProfileId(user), appObj._id, function(err, purchase) {
        if(err) {
          return cb({message: 'ERROR_IN_FETCHING_PURCHASE'});
        }
        cb(err, appObj, purchase);
      });
    }
    , function(appObj, purchase, cb) {
      if(!purchase) {
        return cb({message: 'PURCHASE_NOT_FOUND'});
      }
      if(purchase.status === 'COMPLETE') {
        return cb({message: 'PURCHASE_ALREADY_COMPLETE', purchase: purchase, appObj: appObj});
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
          app.logger.info('Revalidated User: PurchaseKey: ' + purchaseKey);
          return res.render( 'revalidate', view({ layout: false, app: err.appObj }));
        });
      }
      if(err.message === 'PURCHASE_NOT_FOUND' || err.message === 'PURCHASE_NOT_YET_COMPLETE') {
        return res.redirect('/payment/gateways');        
      }
    });
});


app.get('/payment/gateways', ensureSessionPage, function(req, res) {
  res.render('paymentOptions', {paymentOptions: settings.paymentOptions, isGoogleUser: true, app: req.session.app});
});


app.get('/purchase/debug/:key', ensureAuthenticatedApi, function (req, res) {
  if (!settings.app.showDebugInfo) {
    res.send({status: "ok"});
  } else {
    Purchase.findOne({
      purchaseKey: req.params.key
    })
    .populate('app')
    .exec(function (err, purchase) {
      if(err || !purchase){
        return res.send({success: false, error: err});
      }
      return res.send({success: true, purchase: purchase});
    });
  }
});


app.get('/purchase/check/:key', function (req, res) {
  // This is the API for invite app, it does not require session & authenticate
  
  Purchase.findOne({
    purchaseKey: req.params.key,
    status     : 'COMPLETE'
  })
  .populate('app')
  .exec(function (err, purchase) {
    
    if(err){
      app.logger.error('[Req] ' + JSON.stringify(req, ['ip', 'originalUrl', 'headers', 'session'], 2) + '\n[Err] ' + JSON.stringify(err, ['stack', 'message', 'inner'], 2));
      return res.send({success: false});
    }

    if(!purchase) {
      return res.send({
        success: true,
        purchased: false,
        stats: false
      });
    }

    if( !req.isAuthenticated() ){
      return res.send({
        success: true,
        purchased: true,
        stats: false,
        includes: purchase.app.includes
      });
    } else {
      User.findOne({
        email: req.session.passport.user.email,
        login: req.session.passport.user.login
      }, function(err, u) {
        
        if(err || !u) {
          app.logger.error('[Req] ' + JSON.stringify(req, ['ip', 'originalUrl', 'headers', 'session'], 2) + '\n[Err] ' + JSON.stringify(err, ['stack', 'message', 'inner'], 2));
          return res.send({success: false});
        }
        
        var user = u.toJSON();
        var stats = user[settings.app.stats];
        if( typeof(stats)==='undefined' ){
          stats = false;
        }
      
        res.send({
          success: true,
          purchased: true,
          stats: stats,
          includes: purchase.app.includes
        });
      });
    }
  });
});


function insertNewPurchase(user, appId, purchaseKey, token, orderId) {
  app.logger.info('NEW ORDER: ' + token); 
  var p = {
    orderNumber: token,
    app        : appId,
    purchaseKey: purchaseKey,
    user       : user._id,
    googleId   : getProfileId(user),
    status     : 'PENDING',
    orderId    : orderId || createId()
  };
  var purchase = new Purchase(p);
  purchase.save();
}


function markPurchaseAsComplete(token) {

  Purchase.findOne({
    orderNumber : token
  }).populate('app').exec(function(err, purchase) {
    
    if(err){
      app.logger.error('Could not fetch purchase: ' + token);
      return;
    }

    if(!purchase){
      app.logger.error('PURCHASE NOT FOUND: ' + token);
      return;
    }
    
    var appName = purchase.app.name + ' (' + purchase.app.language + ')';
    app.logger.info('NEW ORDER COMPLETE: ' + token + ' - APP: ' + appName);
    if (settings.app.emailNotify) {
      var subject = appName + ' Order: ' + token;
      var text = '\n created: ' + purchase.created
            + '\n orderId:  ' + purchase.orderId
            + '\n orderNumber: ' + purchase.orderNumber
            + '\n app: ' + appName
            + '\n purchaseKey: ' + purchase.purchaseKey
            + '\n googleId: ' + purchase.googleId;
      SendMailWithRetry(subject, text, 3);
    }

    purchase.status = 'COMPLETE';
    purchase.save(function(){
    
      // Find all pending orders and remove them
      Purchase.find({
        purchaseKey:  purchase.purchaseKey,
        status     : 'PENDING'
      }).populate('app').exec(function(err, list) {
      
        if (err) {
          app.logger.error('Could not fetch pending purchase for PurchaseKey: ' + purchase.purchaseKey);
          return;
        }
        
        // No pending orders found then return
        if (!list || list.length === 0)
          return;
        
        // Remove pending orders
        var len = list.length;
        for(var i = 0; i < len; i++) {
          list[i].remove();
        }
        
        app.logger.info('Removed ' + len + ' PENDING Orders for PurchaseKey: ' + purchase.purchaseKey);
      });
    });    
  });
}


app.get('/fb/checkauth/:id/:key', ensureSessionApi, function (req, res) {
  // This is the API for FFR app, save session before validate authentication
  
  //console.log('USER AT CHECK AUTH: %s', JSON.stringify(req.user, null, 2));
  //console.log('SESSION AT CHECK AUTH: %s', JSON.stringify(req.session, null, 2));
  if( !req.isAuthenticated() ) {
    return req.session.save(function() {
      return res.send({loggedIn: false});
    });
  } else {
    return req.session.save(function() {
      return res.send({loggedIn: true});
    });
  }
});


app.get('/fb/auth', passport.authenticate('facebook', { display: 'popup', scope: ['email', 'user_friends'] } ));
app.get('/fb/login', function(req, res) {
  req.session.from = 'chrome';
  return req.session.save(function() {
    return res.redirect('/fb/auth');
  });
});


app.get('/fb/auth2', passport.authenticate('facebook', { display: 'popup', scope: ['publish_actions'] } ));
app.get('/fb/login2', function(req, res) {
  req.session.from = 'chrome';
  return req.session.save(function() {
    return res.redirect('/fb/auth2');
  });
});


app.get('/fb/friends', ensureAuthenticatedFacebookApi, ensureSessionApi, function (req, res) {
  
  FB.api('me/friends', {
    fields:         'name,picture',
    limit:          5000,
    access_token:   req.session.passport.user.facebook.accessToken
  }, function (result) {
    if(!result || result.error) {
      app.logger.error('[Req] ' + JSON.stringify(req, ['ip', 'originalUrl', 'headers', 'session'], 2) + '\n[Err] friends failed');
      return res.send({success: false, error: result.error || 'error'});
    }
    return res.send({success: true, friends: result});
  });
});


app.get('/fb/wallpost', ensureAuthenticatedFacebookApi, ensureSessionApi, function (req, res) {

  var msg = req.session.app.shareMsg;
  if( msg.name && req.session.passport.user.name ){
    msg.name = msg.name.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
  }
  if( msg.caption && req.session.passport.user.name ){
    msg.caption = msg.caption.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
  }
  if( msg.description && req.session.passport.user.name ){
    msg.description = msg.description.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
  }
  if( msg.message && req.session.passport.user.name ){
    msg.message = msg.message.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
  }
  
  FB.setAccessToken(req.session.passport.user.facebook.accessToken);
  FB.api('me/feed', 'post', msg, function (result) {
    if(!result || result.error) {
      app.logger.error('[Req] ' + JSON.stringify(req, ['ip', 'originalUrl', 'headers', 'session'], 2) + '\n[Err] wallpost failed');
      return res.send({success: false, error: result.error || 'error'});
    }
    User.updateAppStats(req.session.passport.user.email, 
      'facebook', 
      req.session.passport.user.facebook.email, 
      settings.app.stats,
      'has_shared', true, 
      function(err, updatedUser) {
        if(err || !updatedUser) {
          app.logger.error('[Req] ' + JSON.stringify(req, ['ip', 'originalUrl', 'headers', 'session'], 2) + '\n[Err] ' + JSON.stringify(err, ['stack', 'message', 'inner'], 2));
          return res.send({success: false});
        }
        return res.send({success: true, has_shared: true});
      }
    );
  });
});


function gamify(total){
  var level = '';
  var img = '';
  if( total <= 5 ) {
    level = 'Killer';
    img = settings.app.hostname + '/gamify/lv0005.png';
  } else if( total <= 10 ) {
    level = 'Serial Killer';
    img = settings.app.hostname + '/gamify/lv0010.png';
  } else if( total <= 20 ) {
    level = 'Mass Murderer';
    img = settings.app.hostname + '/gamify/lv0020.png';
  } else if( total <= 40 ) {
    level = 'Hit Man';
    img = settings.app.hostname + '/gamify/lv0040.png';
  } else if( total <= 75 ) {
    level = 'Jason';
    img = settings.app.hostname + '/gamify/lv0075.png';
  } else if( total <= 100 ) {
    level = 'Executioner';
    img = settings.app.hostname + '/gamify/lv0100.png';
  } else if( total <= 150 ) {
    level = 'Vampire';
    img = settings.app.hostname + '/gamify/lv0150.png';
  } else if( total <= 200 ) {
    level = 'Zombie Horde';
    img = settings.app.hostname + '/gamify/lv0200.png';
  } else if( total <= 500 ) {
    level = 'Scarlet Fever';
    img = settings.app.hostname + '/gamify/lv0500.png';
  } else if( total <= 1000 ) {
    level = 'The Plague';
    img = settings.app.hostname + '/gamify/lv1000.png';
  } else {
    level = 'Grim Reaper';
    img = settings.app.hostname + '/gamify/lv9999.png';
  }
  return { level: level, img: img };
}


app.get('/fb/shareresults/:num', ensureAuthenticatedFacebookApi, ensureSessionApi, function (req, res) {

  var num = 0;
  try{
    num = parseInt(req.params.num);
  }catch(ee){
    return res.send({success: false});
  }

  // GAMIFY
  var game = gamify(num);
  var msg = req.session.app.shareResultsMsg;
  if( msg.gamifyMsg ) delete msg.gamifyMsg;
  if( msg.picture ){
    msg.picture = msg.picture.replace(/GAME_LEVEL/g, game.level);
    msg.picture = msg.picture.replace(/GAME_IMAGE/g, game.img);
  }
  if( msg.name ){
    if( req.session.passport.user.name ){
      msg.name = msg.name.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
    }
    msg.name = msg.name.replace(/NUMBER/g, num);
    msg.name = msg.name.replace(/GAME_LEVEL/g, game.level);
    msg.name = msg.name.replace(/GAME_IMAGE/g, game.img);
  }
  if( msg.caption ){
    if( req.session.passport.user.name ){
      msg.caption = msg.caption.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
    }
    msg.caption = msg.caption.replace(/NUMBER/g, num);
    msg.caption = msg.caption.replace(/GAME_LEVEL/g, game.level);
    msg.caption = msg.caption.replace(/GAME_IMAGE/g, game.img);
  }
  if( msg.description ){
    if( req.session.passport.user.name ){
      msg.description = msg.description.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
    }
    msg.description = msg.description.replace(/NUMBER/g, num);
    msg.description = msg.description.replace(/GAME_LEVEL/g, game.level);
    msg.description = msg.description.replace(/GAME_IMAGE/g, game.img);
  }
  if( msg.message ){
    if( req.session.passport.user.name ){
      msg.message = msg.message.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
    }
    msg.message = msg.message.replace(/NUMBER/g, num);
    msg.message = msg.message.replace(/GAME_LEVEL/g, game.level);
    msg.message = msg.message.replace(/GAME_IMAGE/g, game.img);
  }
  
  FB.setAccessToken(req.session.passport.user.facebook.accessToken);
  FB.api('me/feed', 'post', msg, function (result) {
    if(!result || result.error) {
      app.logger.error('[Req] ' + JSON.stringify(req, ['ip', 'originalUrl', 'headers', 'session'], 2) + '\n[Err] shareresults failed');
      return res.send({success: false, error: result.error || 'error'});
    }
    return res.send({success: true});
  });
});


app.get('/fb/wallpost/save', ensureAuthenticatedFacebookApi, ensureSessionApi, function (req, res) {
  
  if( req.query.post_id ) {
    User.updateAppStats(req.session.passport.user.email, 
      'facebook', 
      req.session.passport.user.facebook.email, 
      settings.app.stats,
      'has_shared', req.query.post_id, 
      function(err, updatedUser) {
        if(err || !updatedUser) {
          app.logger.error('[Req] ' + JSON.stringify(req, ['ip', 'originalUrl', 'headers', 'session'], 2) + '\n[Err] ' + JSON.stringify(err, ['stack', 'message', 'inner'], 2));
        } else {
          app.logger.info('NEW SHARE: ' + updatedUser.email);
        }
      }
    );
  }
  
  return res.render('fbLoginCallback');
});


app.get('/fb/wallpost/check/:key', ensureAuthenticatedFacebookApi, ensureSessionApi, function (req, res) {

  User.findOne({
    email: req.session.passport.user.email,
    login: req.session.passport.user.login
  }, function(err, u) {
    
    if(err || !u) {
      app.logger.error('[Req] ' + JSON.stringify(req, ['ip', 'originalUrl', 'headers', 'session'], 2) + '\n[Err] ' + JSON.stringify(err, ['stack', 'message', 'inner'], 2));
      return res.send({success: false});
    }
    
    var user = u.toJSON();
    var has_shared = false;
    var stats = user[settings.app.stats];
    if( typeof(stats)!=='undefined' && typeof(stats.has_shared)!=='undefined' ){
      has_shared = (stats.has_shared!==false);
    }
    
    if( has_shared ){
      
      return res.send({success: true, has_shared: true});
    
    } else {
    
      var msg = req.session.app.shareMsg;
      if( msg.name && req.session.passport.user.name ){
        msg.name = msg.name.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
      }
      if( msg.caption && req.session.passport.user.name ){
        msg.caption = msg.caption.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
      }
      if( msg.description && req.session.passport.user.name ){
        msg.description = msg.description.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
      }
      if( msg.message && req.session.passport.user.name ){
        msg.message = msg.message.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
      }
      
      if( msg.redirect_uri && !(/^http.?:\/\//.test(msg.redirect_uri)) ){
        msg.redirect_uri = settings.app.hostname + msg.redirect_uri;
      }
      if( !msg.app_id ){
        msg.app_id = settings.facebook.appId;
      }
      if( !msg.display ){
        msg.display = 'popup';
      }
      
      return res.send({success: true, has_shared: false, sharemsg: msg});
        
    }
  });
});


app.get('/fb/logdeletes/:num', ensureAuthenticatedFacebookApi, ensureSessionApi, function (req, res) {

  var num = 0;
  try{
    num = parseInt(req.params.num);
  }catch(err){
    app.logger.error('[Req] ' + JSON.stringify(req, ['ip', 'originalUrl', 'headers', 'session'], 2) + '\n[Err] ' + JSON.stringify(err, ['stack', 'message', 'inner'], 2));
    return res.send({success: false});
  }

  User.findOne({
    email: req.session.passport.user.email,
    login: req.session.passport.user.login
  }, function(err, u) {
    
    if(err || !u) {
      app.logger.error('[Req] ' + JSON.stringify(req, ['ip', 'originalUrl', 'headers', 'session'], 2) + '\n[Err] ' + JSON.stringify(err, ['stack', 'message', 'inner'], 2));
      return res.send({success: false});
    }
    
    var user = u.toJSON();
    var total = num;
    var stats = user[settings.app.stats];
    if( typeof(stats)!=='undefined' && typeof(stats.total)!=='undefined' ){
      total += parseInt(stats.total);
    }
    
    User.updateAppStats(req.session.passport.user.email, 
      'facebook', 
      req.session.passport.user.facebook.email, 
      settings.app.stats,
      'total', total,
      function(err, updatedUser) {
        if(err || !updatedUser) {
          app.logger.error('[Req] ' + JSON.stringify(req, ['ip', 'originalUrl', 'headers', 'session'], 2) + '\n[Err] ' + JSON.stringify(err, ['stack', 'message', 'inner'], 2));
          return res.send({success: false});
        }

        // use total for the share message
        num = total;
        
        // GAMIFY
        var game = gamify(total);
        var msg = req.session.app.shareResultsMsg;
        if( msg.picture ){
          msg.picture = msg.picture.replace(/GAME_LEVEL/g, game.level);
          msg.picture = msg.picture.replace(/GAME_IMAGE/g, game.img);
        }
        if( msg.name ){
          if( req.session.passport.user.name ){
            msg.name = msg.name.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
          }
          msg.name = msg.name.replace(/NUMBER/g, num);
          msg.name = msg.name.replace(/GAME_LEVEL/g, game.level);
          msg.name = msg.name.replace(/GAME_IMAGE/g, game.img);
        }
        if( msg.caption ){
          if( req.session.passport.user.name ){
            msg.caption = msg.caption.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
          }
          msg.caption = msg.caption.replace(/NUMBER/g, num);
          msg.caption = msg.caption.replace(/GAME_LEVEL/g, game.level);
          msg.caption = msg.caption.replace(/GAME_IMAGE/g, game.img);
        }
        if( msg.description ){
          if( req.session.passport.user.name ){
            msg.description = msg.description.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
          }
          msg.description = msg.description.replace(/NUMBER/g, num);
          msg.description = msg.description.replace(/GAME_LEVEL/g, game.level);
          msg.description = msg.description.replace(/GAME_IMAGE/g, game.img);
        }
        if( msg.message ){
          if( req.session.passport.user.name ){
            msg.message = msg.message.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
          }
          msg.message = msg.message.replace(/NUMBER/g, num);
          msg.message = msg.message.replace(/GAME_LEVEL/g, game.level);
          msg.message = msg.message.replace(/GAME_IMAGE/g, game.img);
        }
        var gamifyMsg = '';
        if( msg.gamifyMsg ){
          gamifyMsg = msg.gamifyMsg;
          delete msg.gamifyMsg;
          
          if( req.session.passport.user.name ){
            gamifyMsg = gamifyMsg.replace(/DISPLAY_NAME/g, req.session.passport.user.name);
          }
          gamifyMsg = gamifyMsg.replace(/NUMBER/g, num);
          gamifyMsg = gamifyMsg.replace(/GAME_LEVEL/g, game.level);
          gamifyMsg = gamifyMsg.replace(/GAME_IMAGE/g, game.img);
        }
        if( msg.redirect_uri && !(/^http.?:\/\//.test(msg.redirect_uri)) ){
          msg.redirect_uri = settings.app.hostname + msg.redirect_uri;
        }
        if( !msg.app_id ){
          msg.app_id = settings.facebook.appId;
        }
        if( !msg.display ){
          msg.display = 'popup';
        }
        
        return res.send({success: true, deletes: total, picture: game.img, message: gamifyMsg, sharemsg: msg});
      }
    );
  });
});




var port = process.argv[2] || 3000;

if (settings.app.emailNotify) {
  var subject = 'Starting up daemon. Port ' + port;
  var text = 'Just a friendly notice.';
  SendMailWithRetry(subject, text, 3);
}

app.listen(port);
app.logger.info('Express server listening on port ' + port + ' in ' + (process.env.NODE_ENV ? process.env.NODE_ENV : 'development') + ' mode');
