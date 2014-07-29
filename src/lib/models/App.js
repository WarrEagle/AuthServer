var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var App;
var appSchema = new Schema();

appSchema.add({
  language:      String,
  name:          { type: String, unique: true },
  description:   String,
  purchaseMsg:   String,
  currency_code: { type: String, default: "USD" },
  price:         Number,
  revalMsg: {
    title:       String,
    body:        String
  },
  shareMsg: {
    picture: String,
    link: String,
    name: String,
    caption: String,
    description: String,
    redirect_uri: String
  },
  shareResultsMsg: {
    picture: String,
    link: String,
    name: String,
    caption: String,
    description: String,
    gamifyMsg: String,
    redirect_uri: String
  },
  includes:      {}
});

module.exports = App = mongoose.model('App', appSchema);
/*

var fbApp = new App({
//"_id" : ObjectId("5398cada8c29d0f1ddb714b1"),
  "language" : "English",
  "name" : "Facebook Friend Remover PRO",
  "description" : "Delete all friends in one click.",
  "purchaseMsg" : "Congratulations! Your application has been updated and the extension will now work in Premium mode.",
  "currency_code" : "USD",
  "price" : "5.99",
  "revalMsg" : {
    "title" : "Successfully revalidated Facebook Friend Remover PRO",
    "body" : "Close this window to return to the app and try tool again."
  },
  "shareMsg" : {
    "link" : "https://chrome.google.com/webstore/detail/pffbifegnecmjnfllegoaekaplhhkfik/",
    "name" : "DISPLAY_NAME is using Facebook Friend Remover. The only app that lets you remove your friends quick and easy. Get your copy today!",
    "caption" : "Friend Remover PRO",
    "description" : "Get control of who's on your friends list. Easily delete FB friends with a few clicks or unfriend them all at once.",
    "redirect_uri" : "/fb/wallpost/save"
  },
  "shareResultsMsg" : {
    "picture" : "GAME_IMAGE",
    "link" : "https://chrome.google.com/webstore/detail/pffbifegnecmjnfllegoaekaplhhkfik/",
    "name" : "DISPLAY_NAME just deleted NUMBER friends using Facebook Friend Remover available for Chrome users. DISPLAY_NAME has achieved the GAME_LEVEL award.",
    "caption" : "Friend Remover PRO",
    "description" : "Get control of who's on your friends list. Easily delete FB friends with a few clicks or unfriend them all at once.",
    "gamifyMsg" : "Your Killer Level: GAME_LEVEL",
    "redirect_uri" : "/gamify/close.html"
  },
  "includes" : {
    "full" : ""
  }
});

fbApp.save(function(err, saved) {
  console.log(saved);
});

var fbApp = new App({
//"_id" : ObjectId("53d7bf8967be7817cad500fe"),
  "language" : "English",
  "name" : "Facebook Unfriend PRO",
  "description" : "Delete all friends in one click.",
  "purchaseMsg" : "Congratulations! Your application has been updated and the extension will now work in Premium mode.",
  "currency_code" : "USD",
  "price" : "5.99",
  "revalMsg" : {
    "title" : "Successfully revalidated Facebook Unfriend PRO",
    "body" : "Close this window to return to the app and try tool again."
  },
  "shareMsg" : {
    "link" : "https://chrome.google.com/webstore/detail/pffbifegnecmjnfllegoaekaplhhkfik/",
    "name" : "DISPLAY_NAME is using Facebook Unfriend. The only app that lets you remove your friends quick and easy. Get your copy today!",
    "caption" : "Facebook Unfriend PRO",
    "description" : "Get control of who's on your friends list. Easily delete FB friends with a few clicks or unfriend them all at once.",
    "redirect_uri" : "/fb/wallpost/save"
  },
  "shareResultsMsg" : {
    "picture" : "GAME_IMAGE",
    "link" : "https://chrome.google.com/webstore/detail/pffbifegnecmjnfllegoaekaplhhkfik/",
    "name" : "DISPLAY_NAME just deleted NUMBER friends using Facebook Unfriend available for Chrome users. DISPLAY_NAME has achieved the GAME_LEVEL award.",
    "caption" : "Facebook Unfriend PRO",
    "description" : "Get control of who's on your friends list. Easily delete FB friends with a few clicks or unfriend them all at once.",
    "gamifyMsg" : "Your Killer Level: GAME_LEVEL",
    "redirect_uri" : "/gamify/close.html"
  },
  "includes" : {
    "full" : ""
  }
});

fbApp.save(function(err, saved) {
  console.log(saved);
});

*/