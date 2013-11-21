var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var Checkout;
var checkoutSchema = new Schema();

checkoutSchema.add({
  serial: String,
  xml: String,
  created: { type: Date, default: Date.now }
});

module.exports = Checkout = mongoose.model('Checkout', checkoutSchema);