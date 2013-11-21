var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
exports.createId = function() {
	return (new ObjectId).toString();
};
