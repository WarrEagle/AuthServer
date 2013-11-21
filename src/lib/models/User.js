var settings = require('../settings.js');
var mongoose = require('mongoose');
var mongooseAuth = require('mongoose-auth');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var User;
var userSchema = new Schema();
  
userSchema.add({
   email: String,
   google: {
      email: String,
      accessToken: String,
      expires: Date,
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


userSchema.statics.updateToken = function (email, provider, token, profileId, callback) {
	var update = {$set: {}};
	update.$set[provider + '.token'] = token;
	var q = { email: email };
	q[provider + '.email'] = profileId;
  return this.collection.findAndModify(q, [], update, {'new': true}, function(err, updatedUser) {
  	callback(err, updatedUser);
  });
};

userSchema.statics.findOrCreate = function (email, update, callback) {
	//TODO: complete it & refactor
};

module.exports = User = mongoose.model('User', userSchema);

