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
  "language" : "English",
  "name" : "Facebook Friend Remover PRO",
  "description" : "Delele all friends in one click",
  "purchaseMsg" : "Congratulations! Your application has been updated and the extension will now work in premium mode.",
  "currency_code" : "USD",
  "price" : 3.99,
  "revalMsg" : {
    "title" : "Successfully revalidated Facebook Friend Remover PRO",
    "body" : "Close this window to return to the app and try tool again."
  },
  "shareMsg": {
    "link": "http://friend-manager.com/",
    "name": "DISPLAY_NAME is using Facebook Friend Remover. The only app that lets you remove your friends quick and easy. Get your copy today!",
    "caption": "Friend Remover PRO",
    "description" : "Delele all friends in one click",
    "redirect_uri": "/fb/wallpost/save"
  },
  "shareResultsMsg": {
    "picture": "GAME_IMAGE",
    "link": "http://friend-manager.com/",
    "name": "DISPLAY_NAME just deleted NUMBER friends using Facebook Friend Remover available for Chrome users. He has achieved the GAME_LEVEL award.",
    "caption": "Friend Remover PRO",
    "description" : "Delele all friends in one click",
    "gamifyMsg": "Your Killer Level: GAME_LEVEL",
    "redirect_uri": "/gamify/close.html"
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
  "purchaseMsg" : "¡Felicitaciones! Su aplicación se ha actualizado y la extensión ahora funcionará en modo de alta calidad.",
  "currency_code" : "USD",
  "price" : 3.99,
  "revalMsg" : {
    "title" : "Éxito revalidado Facebook Invite All PRO amigos!",
    "body" : "Cierre esta ventana para volver a la aplicación e intente de nuevo la herramienta."
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
  "purchaseMsg" : "Congratulazioni! L'applicazione è stata aggiornata e l'estensione ora funziona in modalità premium.",
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
  "purchaseMsg" : "Parabéns! O aplicativo foi atualizado e extensão vai agora trabalhar no modo premium.",
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
  "description" : "Défilement automatique et sélectionnez tous les amis en un seul clic",
  "purchaseMsg" : "Félicitations! Votre demande a été mise à jour et l'extension va maintenant travailler en mode premium.",
  "currency_code" : "USD",
  "price" : 3.99,
  "revalMsg" : {
    "title" : "Succès revalidé Facebook Invitez des amis Toutes PRO!",
    "body" : "Fermez cette fenêtre pour revenir à l'application et essayez à nouveau outil."
  },
  "includes" : {
    "full" : "function selectAll(){var a=scroll.scrollHeight;scroll.scrollTop=scroll.scrollTop+1e3,$('[name=\"checkableitems[]\"]:not(:checked)').click(),setTimeout(function(){scroll.scrollHeight>a&&setTimeout(selectAll,0)},500)}selectAll()"
  }
});

fbApp.save(function(err, saved) {
  console.log(saved);
});
*/