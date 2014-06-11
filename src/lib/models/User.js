var settings = require('../settings.js');
var mongoose = require('mongoose');
//var mongooseAuth = require('mongoose-auth');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var User;
var userSchema = new Schema();
  
userSchema.add({
  email: String,
  name: String,
  google: {
    email: String,
    accessToken: String,
    expires: Date
  },
  appId: {
    has_shared: Boolean,
    total: Number
  },
  login: String
});

/*
userSchema.plugin(mongooseAuth, {
  everymodule: {
    everyauth: {
      User: function () {
        return User;
      }
    }
  },
  google: {
    everyauth: {
      appId: settings.google.everyauth.appId,
      appSecret: settings.google.everyauth.appSecret,
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      redirectPath: '/postauth',
      myHostname: settings.app.hostname
    }
  }
});
*/


userSchema.statics.updateToken = function (email, provider, token, profile, callback) {
	var profileId = profile.id;
  var displayName = profile.displayName;
  var update = {$set: {}};
  update.$set['name'] = displayName;
	update.$set[provider + '.accessToken'] = token;
	var q = { email: email };
	q[provider + '.email'] = profileId;
  return this.collection.findAndModify(q, [], update, {'new': true}, function(err, updatedUser) {
  	if( typeof(callback) === 'function' )
      callback(err, updatedUser);
  });
};


userSchema.statics.updateAppStats = function (email, profileId, appId, statsName, statsValue, callback) {
	var update = {$set: {}};
	update.$set[appId + '.' + statsName] = statsValue;
	var q = { email: email };
	q['facebook.email'] = profileId;
  return this.collection.findAndModify(q, [], update, {'new': true}, function(err, updatedUser) {
  	if( typeof(callback) === 'function' )
      callback(err, updatedUser);
  });
};


userSchema.statics.findOrCreate = function (email, update, callback) {
	//TODO: complete it & refactor
};

module.exports = User = mongoose.model('User', userSchema);

