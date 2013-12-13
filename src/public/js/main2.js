/**
 * Facebook Friends List Manager by Michael Quale and kickasschromeapps.com
 * Configurations.
 */
var currentCondition;

$(function(){
	new Progress();
	Progress.show(Progress.TEXT_INITIALIZING);
});

/**
 * Main.
 */
var Main = function() {
};
Main.prototype.start = function() {

	//Displays and Controls
	new AddToListButton();
	new RemoveFromListButton();
	new CreateListButton();
	new DeleteListButton();
	new DisplayingList();
	new TargetList();
	new TargetFriends();
	new TargetFriendsAll();
	
	$('#wrap').animate({opacity:1});
};

var DeleteListsDialog = function(onDelete){
    $('#confirm').dialog({
        resizable:false,
        modal:true,
//        autoOpen:false,
        closeText:'',
        show:'fade',
        hide:'fade',
        buttons:{
            'Delete':function(){
                $( this ).dialog( "close" );
                onDelete();
            },
            Cancel:function(){
                $( this ).dialog( "close" );
            }
        }
    });
};

var DeleteListButton = function() {

	$('#deleteListButton').click(function() {
		var targets=$('#targetList ul li.ui-selected');
		if(!targets.length) return false;

        new DeleteListsDialog(function(){

            var total=targets.length;
            var current=0;
            Progress.show('0/'+total);

            targets.each(function() {
                if($(this).attr('list_type')!='user_created'){
                    return;
                }
                var listId=$(this).attr('list_id');
                var self=this;

                FB.api('/' + listId, 'delete', function(res) {
                    if (res) {
                        $('#targetList ul li[list_id='+listId+']').remove();
                        $('#displayingList ul li[list_id='+listId+']').remove();
                    } else {
                        alert('error');
                    }
                    current++;
                    Progress.setText(current+'/'+total);
                    if(current==total){
                        DisplayingList.refresh();
                        TargetList.refresh();
                        if(!$('#displayingList ul li[list_id='+currentCondition+']').length){
                            new TargetFriendsAll();
                        }else{
                            Progress.hide(Progress.TEXT_COMPLETE);
                        }
                    }
                });
            });
        });
	});
};

var CreateListButton = function(){
	$('#createListButton img').click(function() {
		var name = $('#createListButton input').val();
		if(!name) return false;

		Progress.show(Progress.TEXT_PROCESSING);

		FB.api('/me/friendlists?name=' + name, 'post', function(res) {
			if (res && res.id) {
				new TargetListButton(res.id, 'user_created', name);
				new DisplayingListButton(res.id, 'user_created', name);
				$('#createListButton input').val('');
			} else {
				alert('error');
			}
			Progress.hide(Progress.TEXT_COMPLETE);
		});
	});

}

var DisplayingList = function(){
//    console.log('#1');
    FB.api('/me/friendlists', function(res) {
//        console.log('#2');
//        console.log(res);
		new DisplayingListButton('0', '', 'All');
		$.each(res.data, function(i, val) {
			new DisplayingListButton(val.id, val.list_type, val.name);
		});
		$('#displayingList li:first').addClass('selected');
	});
};

DisplayingList.refresh=function(){
    $('#displayingList ul li').each(function(i,val){
        $('img',val).css('top',$(val).offset().top-9);
    });
};

var DisplayingListButton = function(id, list_type, name) {

	if(name.length>13){
		name=name.substr(0,13)+'...';
	}

	var top=55+10;
	if($('#displayingList ul li:last').length){
		top=$('#displayingList ul li:last').offset().top;
	}

	var img=$('<img class="arrow" src="img/arrow_blue.png"/>')
		.css({
			'top':top
		});

	$('<li/>')
		.attr( {
			list_id : id
	})
	.text(name).click(function() {
		$('#displayingList li.selected').removeClass('selected');
		$(this).addClass('selected');

		Progress.show(Progress.TEXT_PROCESSING);
		if (id == 0) {
			new TargetFriendsAll();
			currentCondition=0;
		} else {
			new TargetFriendListed(id);
			currentCondition=id;
		}
	})
	.append(img)
	.appendTo($('#displayingList ul'));
};

var TargetList = function(){
	FB.api('/me/friendlists', function(res) {
		$.each(res.data, function(i, val) {
			new TargetListButton(val.id, val.list_type, val.name);
		});
	});
	$('#targetList ul').selectable();
};

TargetList.refresh=function(){
    $('#targetList ul li').each(function(i,val){
        $('img',val).css('top',$(val).offset().top-9);
    });
};

var TargetListButton = function(id, list_type, name) {
	if(name.length>13){
		name=name.substr(0,13)+'...';
	}

	var top=55+10;
	if($('#targetList ul li:last').length){
		top=$('#targetList ul li:last').offset().top;
	}

	var img=$('<img class="arrow" src="img/arrow_blue.png"/>')
		.css({
			'top':top
		});

	$('<li/>')
		.attr( {
			'list_id' : id,
			'list_type' : list_type
	})
	.text(name)
	.append(img)
	.appendTo($('#targetList ul'));
};

var TargetFriendsAll = function() {
	var container = $('#targetFriends ul');
	container.empty();

	FB.api('/me/friends', function(res) {
		$.each(res.data, function(i, val) {
			new Friend(val.id,val.name);
		});
		container.selectable();
		$('#displayingList li:first').addClass('selected');
		Progress.hide(Progress.TEXT_COMPLETE);
	});
};

var TargetFriendListed = function(id) {
	var container = $('#targetFriends ul');
	container.empty();

	FB.api('/' + id + '/members', function(res) {
		$.each(res.data, function(i, val) {
			new Friend(val.id,val.name);
		});
		container.selectable();
		Progress.hide(Progress.TEXT_COMPLETE);
	});
};

var Friend = function(id, name) {	
	var container = $('#targetFriends ul');
	var elm = $('<li facebook_id="'+id+'"><img src="https://graph.facebook.com/' + id + '/picture" alt="" width="75px" height="75px"><span>'+name+'</span></li>');
	container.append(elm);
};

var TargetFriends=function(){
	var elm=$('#targetFriends');
	var img=$('<img class="arrow" src="img/arrow_white.png" />')
		.css({
			'position':'absolute',
			'right':'-12px',
			'top':'85px'
		});
	elm.append(img);
	var onResize=function(){
		elm=$(elm);
		elm.width($(window).width()-20-20-125-14-14-125-14-125);
	};
	$(window).resize(onResize);
	onResize();
}

TargetFriends.onResize=function(){
	$('#targetFriends img.arrow').css({
		'top':($('#targetFriends ul').height()-$('#targetFriends img.arrow').height())/2+'px'
	});
};

var AddToListButton=function(){
	var elm=$('#addToListButton');
	var onResize=function(){
		elm=$(elm);
		elm.height(($(window).height()-20-30-5-20)/2-1);
		$('img',elm).css({marginTop:(elm.height()-100)/2-1});
	};
	$(window).resize(onResize);
	onResize();

	elm.click(function(){
		var friendIds = [];
		$('#targetFriends ul li.ui-selected').each(function() {
			var fbId = $(this).attr('facebook_id');
			friendIds.push(fbId);
		});
		if(!friendIds.length) return false;

		var listIds = [];
		$('#targetList ul li.ui-selected').each(function() {
			listIds.push($(this).attr('list_id'));
		});
		if(!listIds.length) return false;

		// start
		var cnt=0;
		var total=friendIds.length*listIds.length;

		Progress.show('0/'+total);

		$.each(friendIds, function(i, friend) {
			$.each(listIds, function(j, list) {
				var url = '/' + list + '/members/' + friend;
				FB.api(url, 'post', function(res) {
					cnt++;
					Progress.setText(cnt+'/'+total);
					if(cnt==listIds.length*friendIds.length){
						Progress.hide(Progress.TEXT_COMPLETE);
					}
				});
			});
		});
	});
};

var RemoveFromListButton=function(){
	var elm=$('#removeFromListButton');
	var onResize=function(){
		elm=$(elm);
		elm.height(($(window).height()-20-30-5-20)/2-1);
		$('img',elm).css({marginTop:(elm.height()-100)/2-1});
	};
	$(window).resize(onResize);
	onResize();


	elm.click(function(){

		var friendIds = [];
		$('#targetFriends ul li.ui-selected').each(function() {
			var fbId = $(this).attr('facebook_id');
			friendIds.push(fbId);
		});
		if(!friendIds.length) return false;

		var listIds = [];
		$('#targetList ul li.ui-selected').each(function() {
			listIds.push($(this).attr('list_id'));
		});
		if(!listIds.length) return false;

		// start
		var cnt=0;
		var total=friendIds.length*listIds.length;

		Progress.show('0/'+total);

		$.each(friendIds, function(i, friend) {
			$.each(listIds, function(j, list) {
				var url = '/' + list + '/members/' + friend;
				FB.api(url, 'delete', function(res) {
					if(currentCondition==list){
						$('#targetFriends li[facebook_id='+friend+']').remove();
					}
					cnt++;
					Progress.setText(cnt+'/'+total);
					if(cnt==friendIds.length*listIds.length){
						Progress.hide(Progress.TEXT_COMPLETE);
					}
				});
			});
		});
	});
};

var Progress=function(){
	$('#mask').css({'opacity':'0.8'});
	var onResize=function(){
		$('#progress').css({'margin-top':($(window).height()-$('#progress').height())/2});
		$('#mask').css({'height':$(window).height()});
	};
	$(window).resize(onResize);
	onResize();
};

Progress.show = function(text){
	if(text!=null) Progress.setText(text);
	$('#mask').show();
    $('#progress').fadeIn(300);
};

Progress.hide = function(text){
	if(text!=null) Progress.setText(text);
	$('#mask').delay(300).fadeOut(0);
    $('#progress').fadeOut(300);
};

Progress.setText=function(value){
	$('#progress span').text(value);
};

Progress.TEXT_INITIALIZING='Initializing...';

Progress.TEXT_PROCESSING='Processing...';

Progress.TEXT_COMPLETE='Completed.';

var RemoveButton=function(elm){
	$(elm).click(function(){
		var root = $('#fb-root');
		var friendlistsContainer = $('#friendlists-container');
		
		var friends = [];
		root.find('.friend.ui-selected').each(function() {
			var fbId = $(this).attr('facebookid');
			friends.push(fbId);
		});
	
		var lists = [];
		friendlistsContainer.find('input:checked').each(function() {
			lists.push($(this).val());
		});
		
		if(!friends.length || !lists.length) return;
		
		// start
		var cnt=0;
		$('#mask').show();
		$.each(friends, function(i, friend) {
			$.each(lists, function(j, list) {
				var url = '/' + list + '/members/' + friend;
				FB.api(url, 'delete', function(res) {
					if(currentCondition==list){
						root.find('div[facebookid='+friend+']').remove();
					}
					cnt++;
					if(cnt==friends.length*lists.length){
						alert('complete.');
						$('#mask').hide();
					}
				});
			});
		});
	});
};



var AddButton = function(){
	// add friends to selected list.
	$('#add-btn').click(function() {
		var friends = [];
		root.find('.friend.ui-selected').each(function() {
			var fbId = $(this).attr('facebookid');
			friends.push(fbId);
		});

		var lists = [];
		friendlistsContainer.find('input:checked').each(function() {
			lists.push($(this).val());
		});

		if(!friends.length || !lists.length) return false;

		$('#mask').show();

		// start
		var cnt=0;
		$.each(friends, function(i, friend) {
			$.each(lists, function(j, list) {
				// FB.api('')
				var url = '/' + list + '/members/' + friend;
				FB.api(url, 'post', function(res) {
					cnt++;
					if(cnt==lists.length*friends.length){
						alert('complete.');
						$('#mask').hide();
					}
				});
			});
		});
	});
};

/**
 * Facebook Javascript SDK Initialize.
 */

 window.fbAsyncInit = function() {
	FB.init( {
		appId : Config.appId, // App ID
		channelURL : '//facebookfriendmanger.channel.html', // Channel File
		status : true, 		// check login status
		cookie : true,		// enable cookies to allow the server to access the session
		oauth : true,		// enable OAuth 2.0,
		xfbml : true		// parse XFBML
	});

	// check login
	FB.getLoginStatus(function(res) {

        if (res.status != 'connected') {
            Progress.hide();
            $('#join').delay(300).fadeIn();
            $('#join').click(function(){

                $('#join').fadeOut();
                Progress.show(Progress.TEXT_INITIALIZING);

                FB.login(function(response) {
                    if (response.authResponse) {
                        new Main().start();
                    } else {
                    }
                }, {
                    scope : 'user_location,friends_birthday,friends_location,friends_relationships,read_friendlists,manage_friendlists,'
                });
            });
		}else{
			// start main.
			new Main().start();
        }

	});
};

/**
 * Load the SDK Asynchronously.
 */

 (function(d) {
	var js, id = 'facebook-jssdk';
	if (d.getElementById(id)) {
		return;
	}
	js = d.createElement('script');
	js.id = id;
	js.async = true;
	js.src = "//connect.facebook.net/en_US/all.js";
	d.getElementsByTagName('head')[0].appendChild(js);
}(document));