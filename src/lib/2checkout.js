var TwoCheckout = require("2checkout-node"),
    conf, tco;

exports.init = function(config){
  tco = new TwoCheckout(config);
  conf = config;
  return tco;
};

exports.create = function(paymentId, app, callback){
  var TwoCheckoutParams = {
    "mode": conf.mode,
    "demo": conf.demo_order,
    "merchant_order_id": paymentId,
    "li_0_type": "product",
    "li_0_name": app.name + " - " + app.description,
    "li_0_quantity": 1,
    "li_0_price": app.price.toString(),
    "li_0_tangible": "N",
    "currency_code": conf.currency,
    "x_receipt_link_url": 'http://' + conf.host + ':' + (conf.port ? conf.port : 3000) + '/' + conf.returnPath
  };
  var link = tco.checkout.link(TwoCheckoutParams);
  callback(null, link);
};

exports.validate = function(data){
  console.log(tco.response.valid(data, data.total), JSON.stringify(data, null, 2));
  return data.credit_card_processed == "Y" && tco.response.valid(data, data.total);
};

exports.execute = function(data, orderNumber, callback){
  var now = (new Date()).toISOString().replace(/\.[\d]{3}Z$/, 'Z ');
  var t = {
    id: orderNumber,
    type: "sale",
    paymentType: data.mode,
    orderTime: now,
    amount: data.total,
    currencyCode: data.currency_code,
    taxAmount: "",
    paymentStatus: ((data.credit_card_processed == "Y") ? "Approved" : "Pending")
  };
  var payer = {
    method: data.mode,
    info: {
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      id: data.email
    }
  }
  callback(null, payer, t);
};

