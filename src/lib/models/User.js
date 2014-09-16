var settings = require('../settings.js');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var User;
var userSchema = new Schema();

userSchema.add({
  email: String,
  name: String,
  gender: String,
  address: String,
  city: String,
  state: String,
  zip: String,
  country: String,
  country_code: String,
  phone: String,
  google: {
    email: String,
    accessToken: String,
    expires: Date
  },
  facebook: {
    email: String,
    accessToken: String
  },
  appId: {
    has_shared: Boolean,
    total: Number
  },
  login: String
});


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


userSchema.statics.updateAppStats = function (email, provider, profileId, appId, statsName, statsValue, callback) {
	var update = {$set: {}};
	update.$set[appId + '.' + statsName] = statsValue;
	var q = { email: email };
	q[provider + '.email'] = profileId;
  return this.collection.findAndModify(q, [], update, {'new': true}, function(err, updatedUser) {
  	if( typeof(callback) === 'function' )
      callback(err, updatedUser);
  });
};


userSchema.statics.findOrCreate = function (email, update, callback) {
	//TODO: complete it & refactor
};

module.exports = User = mongoose.model('User', userSchema);

