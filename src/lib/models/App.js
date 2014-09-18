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

var fbApp = new App({
  "language" : "English",
  "name" : "Facebook Invite All Friends PRO",
  "description" : "Autoscroll and select all friends in one click",
  "purchaseMsg" : "Congratulations! Your application has been updated and the extension will now work in premium mode.",
  "currency_code" : "USD",
  "price" : 3.99,
  "revalMsg" : {
    "title" : "Successfully revalidated Facebook Invite All Friends PRO,
    "body" : "Close this window to return to the app and try tool again."
  },
  "includes" : {
    "full" : "function selectAll(){var a=scroll.scrollHeight;scroll.scrollTop=scroll.scrollTop+1e3,$('[name=\"checkableitems[]\"]:not(:checked)').click(),setTimeout(function(){scroll.scrollHeight>a&&setTimeout(selectAll,0)},500)}selectAll()"
  }
});

fbApp.save(function(err, saved) {
  console.log(saved);
});

fbApp = new App({
  "language" : "Spanish",
  "name" : "Invitar a todos los amigos de Facebook Pro",
  "description" : "Autodesplazamiento y seleccionar todos los amigos en un solo clic",
  "purchaseMsg" : "�Felicitaciones! Su aplicaci�n se ha actualizado y la extensi�n ahora funcionar� en modo de alta calidad.",
  "currency_code" : "USD",
  "price" : 3.99,
  "revalMsg" : {
    "title" : "�xito revalidado Facebook Invite All PRO amigos!",
    "body" : "Cierre esta ventana para volver a la aplicaci�n e intente de nuevo la herramienta."
  },
  "includes" : {
    "full" : "function selectAll(){var a=scroll.scrollHeight;scroll.scrollTop=scroll.scrollTop+1e3,$('[name=\"checkableitems[]\"]:not(:checked)').click(),setTimeout(function(){scroll.scrollHeight>a&&setTimeout(selectAll,0)},500)}selectAll()"
  }
});

fbApp.save(function(err, saved) {
  console.log(saved);
});

fbApp = new App({
  "language" : "Italian",
  "name" : "Facebook Invita amici Tutto Pro",
  "description" : "Scorrimento e selezionare tutti gli amici in un click",
  "purchaseMsg" : "Congratulazioni! L'applicazione � stata aggiornata e l'estensione ora funziona in modalit� premium.",
  "currency_code" : "USD",
  "price" : 3.99,
  "revalMsg" : {
    "title" : "Successo riconvalidato Facebook Invita tutti PRO amici!",
    "body" : "Chiudi questa finestra per tornare alla applicazione e provare di nuovo lo strumento."
  },
  "includes" : {
    "full" : "function selectAll(){var a=scroll.scrollHeight;scroll.scrollTop=scroll.scrollTop+1e3,$('[name=\"checkableitems[]\"]:not(:checked)').click(),setTimeout(function(){scroll.scrollHeight>a&&setTimeout(selectAll,0)},500)}selectAll()"
  }
});

fbApp.save(function(err, saved) {
  console.log(saved);
});

fbApp = new App({
  "language" : "Portuguese",
  "name" : "Facebook convidamos a todos os amigos Pro",
  "description" : "Autoscroll e selecione todos os amigos em um clique",
  "purchaseMsg" : "Parab�ns! O aplicativo foi atualizado e extens�o vai agora trabalhar no modo premium.",
  "currency_code" : "USD",
  "price" : 3.99,
  "revalMsg" : {
    "title" : "Sucesso revalidado Facebook convidamos a todos os PRO amigos!",
    "body" : "Fechar esta janela e voltar para o aplicativo e tentar ferramenta novamente."
  },
  "includes" : {
    "full" : "function selectAll(){var a=scroll.scrollHeight;scroll.scrollTop=scroll.scrollTop+1e3,$('[name=\"checkableitems[]\"]:not(:checked)').click(),setTimeout(function(){scroll.scrollHeight>a&&setTimeout(selectAll,0)},500)}selectAll()"
  }
});

fbApp.save(function(err, saved) {
  console.log(saved);
});

fbApp = new App({
  "language" : "French",
  "name" : "Facebook Invitez des amis Toutes les Pro",
  "description" : "D�filement automatique et s�lectionnez tous les amis en un seul clic",
  "purchaseMsg" : "F�licitations! Votre demande a �t� mise � jour et l'extension va maintenant travailler en mode premium.",
  "currency_code" : "USD",
  "price" : 3.99,
  "revalMsg" : {
    "title" : "Succ�s revalid� Facebook Invitez des amis Toutes PRO!",
    "body" : "Fermez cette fen�tre pour revenir � l'application et essayez � nouveau outil."
  },
  "includes" : {
    "full" : "function selectAll(){var a=scroll.scrollHeight;scroll.scrollTop=scroll.scrollTop+1e3,$('[name=\"checkableitems[]\"]:not(:checked)').click(),setTimeout(function(){scroll.scrollHeight>a&&setTimeout(selectAll,0)},500)}selectAll()"
  }
});

fbApp.save(function(err, saved) {
  console.log(saved);
});

*/