var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var Purchase;
var purchaseSchema = new Schema();

purchaseSchema.add({
	orderId:			String,
  orderNumber:  String,
  app:          { type: ObjectId, ref: 'App' },
  purchaseKey:  String,
  googleId:     String,
  status:       String,
  user:         { type: ObjectId, ref: 'User' },
  mode:         { type: String, default: 'Purchase' },
  created:      { type: Date, default: Date.now }
});

module.exports = Purchase = mongoose.model('Purchase', purchaseSchema);
