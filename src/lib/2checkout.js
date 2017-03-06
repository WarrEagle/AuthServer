var TwoCheckout = require("2checkout-node"),
    conf, tco;


exports.init = function(config){
  tco = new TwoCheckout(config);
  conf = config;
  return tco;
};


exports.create = function(billinfo, orderId, app, callback){

  var TwoCheckoutParams = {
    "mode": conf.mode,
    "merchant_order_id": orderId,
    "li_0_type": "product",
    "li_0_name": app.name + " - " + app.description,
    "li_0_quantity": 1,
    "li_0_price": app.price.toString(),
    "li_0_tangible": "N",
    "currency_code": conf.currency,
    "x_receipt_link_url": "http://" + conf.host + ((conf.port && conf.port!="80") ? (":"+conf.port+"/") : "/") + conf.returnPath
  };
  
  // only pass the params below when needed
  if( conf.demo ) TwoCheckoutParams.demo = "Y";
  if( billinfo.name ) TwoCheckoutParams.card_holder_name = billinfo.name;
  if( billinfo.email && /^.+@.+\..+$/.test(billinfo.email) ) TwoCheckoutParams.email = billinfo.email;
  if( billinfo.address ) TwoCheckoutParams.street_address = billinfo.address;
  if( billinfo.city ) TwoCheckoutParams.city = billinfo.city;
  if( billinfo.state ) TwoCheckoutParams.state = billinfo.state;
  if( billinfo.zip ) TwoCheckoutParams.zip = billinfo.zip;
  if( billinfo.country_code ) TwoCheckoutParams.country = billinfo.country_code;
  if( billinfo.phone ) TwoCheckoutParams.phone = billinfo.phone;
  
  // create hosted checkout link and redirect
  var link = tco.checkout.link(TwoCheckoutParams);
  callback(null, link);
};


exports.validate = function(data){
  //console.log(tco.response.valid(data, data.total), JSON.stringify(data, null, 2));
  return data.credit_card_processed == "Y" && tco.response.valid(data, data.total);
};


exports.execute = function(data, orderNumber, callback){

  var now = (new Date()).toISOString().replace(/\.[\d]{3}Z$/, 'Z ');
  var trans = {
    id: orderNumber,
    type: "sale",
    paymentType: data.pay_method,
    orderTime: now,
    amount: data.total,
    currencyCode: conf.currency,
    taxAmount: "",
    paymentStatus: ((data.credit_card_processed == "Y") ? "Approved" : "Pending")
  };
  
  var payer = {
    method: data.pay_method,
    info: {
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      id: data.email
    }
  };
  
  callback(null, payer, trans);
};

