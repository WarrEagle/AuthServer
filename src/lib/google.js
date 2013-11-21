var fs = require('fs');
var hbs = require('hbs');
var htmlentity = require('./htmlentity.js');
var https = require('https');
var select = require('JSONSelect');
var settings = require('./settings.js');
var Step = require('step');
var xmlparser = require('libxml-to-js');

function getCheckoutOptions(api, xml) {
  var options = {
    host: settings.google.host,
    port: 443,
    path: settings.google.api_path + api + '/Merchant/' + settings.google.merchant_id,
    method: 'POST',
    headers: {  
      'Content-Type': 'application/x-www-form-urlencoded',  
      'Content-Length': Buffer.byteLength(xml),
      'Accept': 'application/xml; charset=UTF-8',
      'Authorization': 'Basic ' + (new Buffer(settings.google.merchant_id + ':' + settings.google.merchant_key)).toString('base64')
    } 
  };
  return options; 
}

var google = {
  checkout: function (template, variables, cb) {
    Step(
      function readTemplateFile() {
        fs.readFile(template, 'utf8', this);
      },

      function compileAndSendXml(err, xml) {
        var temp = hbs.handlebars.compile(xml);
        var compiled = temp(variables);
        var options = getCheckoutOptions('merchantCheckout', compiled);
        var next = this;
        var req = https.request(options, function (res) {
          var data = '';
          res.on('data', function (d) {
            data += d;
          });
          
          res.on('end', function () {
            next(null, data);
          });
        });
      
        req.write(compiled);
        req.end();
      },

      function parseXML(err, xml) {
        xmlparser(xml, this);
      },

      function parseRedirectURL(err, json) {
        var url = select.match('.redirect-url', json)[0];
        if (!url) {
          // Google has returned with an error message. This is a known problem with G Checkout
          console.log("On Checkout Google returned with error message" + JSON.stringify(json));
          console.log("There should be a redirect here. @TODO");
          cb(null, {redirect: htmlentity.decode("/buy" + variables.app._id)});
        } else {
          cb(null, { redirect: htmlentity.decode(url) });
        }
      }
    );
  },
  
  handleNotification: function (req, res, log, cb) {
    var serial = req.body['serial-number'];
    Step(
      function verifyCheckout() {
        var xml  = '<notification-history-request xmlns="http://checkout.google.com/schema/2">';
        xml += '<serial-number>' + serial + '</serial-number>';
        xml += '</notification-history-request>';
        
        var options = getCheckoutOptions('reports', xml);
        var next = this;
        var verificationReq = https.request(
          options,
          function (verificationRes) {
            var data = '';
            
            verificationRes.on('data', function (d) {
              data += d;
            });
            
            verificationRes.on('end', function () {
              next(null, data);
            });
          }
        );
        
        verificationReq.write(xml);
        verificationReq.end();
      },

      function saveCheckout(err, xml) {
        log(serial, xml);
        this.parallel()(null, xml);
        xmlparser(xml, this.parallel());
      },

      function savePurchase(err, xml, json) {
        var orderNumber = select.match('.google-order-number', json);
        orderNumber = orderNumber.length ? orderNumber[0] : null;

        var orderStateData = xml.match(/order-state-change-notification/);
        orderStateData = orderStateData ? json : null;

        cb(
          err,
          {
            orderNumber: orderNumber,
            merchantData: select.match('.merchant-private-data', json),
            orderStateData: orderStateData,
            riskNotification: xml.match(/risk-information-notification/)
          }
        );
      }
    );
  
    res.send('serial-number=' + serial);
  }
};

module.exports = google;
