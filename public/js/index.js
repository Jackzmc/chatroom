
const output = document.getElementById('chat_list');
const title = document.title; //grab original
const markdown = new showdown.Converter({
    noHeaderId:true,
    simplifiedAutoLink:true,
    headerLevelStart:6,
    emoji:true,
    strikethrough:true
});
let socket;
if(!botCheck()) {
    socket = io.connect({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax : 5000,
        reconnectionAttempts: 99999
    }); //Connect to server
}
console.info('Socket.io chatroom - Created by Jackz#7627 - Source: https://github.com/jackzmc/chatroom')
alertify.parent(document.getElementById('alertify-logs'))
let user = getCookie("lastNickname");
let connectedbefore = false; //check if user has been actually connected before (or HAS joined)
let settings = {
    sounds:true,
    notifications:true,
    compactMode:false,
    nick:null,
}
let rooms = [];
let current_channel = getCookie("lastChannel")||'general';
let new_settings = getCookie('settings')
if(!new_settings) {
    setCookie("settings",JSON.stringify(settings),365);
}else{
    console.debug("Using stored settings");
    settings = JSON.parse(new_settings);
    $('#settings_compact').prop('checked',settings.compactMode)
    $('#settings_notifications').prop('checked',settings.notifications);
    $('#settings_sounds').prop('checked',settings.sounds);
}
if(settings.notifications) {
    notificationEnable();
}
autoSave()

$(document).ready(() => {  //get user logged in
    //var userp = prompt("Please choose a username");
    if(!user) {
        console.log('Prompting user')
        alertify.prompt("Enter a nickname",(val,ev) => {
            ev.preventDefault();
            user = val;
        },(ev) => {
            ev.preventDefault();
            //
        })
        if(user) setCookie("lastNickname",user);
    }
    if(!user) return;
    socket.emit('join',user)
    switchChannel(current_channel)
    alertify.logPosition('bottom right')
    alertify.success(`You have joined #${current_channel}`);
	$('#info').html(`<b>@${user}</b><br>#${current_channel}`);
    connectedBefore = true;
    return window.loading_screen.finish();
});

window.onbeforeunload = e => { //log user out
    //socket.emit('quit',user);
}
/*check if socket disconnect*/
socket.on('connect',data => {
	if(connectedbefore){
        alertify.logPosition('bottom right')
        alertify.delay(10000)
        .success(`Reconnected to ${current_channel}`)
        .reset()
		if(user !== undefined || user !== "") {
			socket.emit('join',user); //reconnect user, when socket joins AFTER they actually did this already
            socket.emit('channelSwitch',current_channel);
		}
		$('#chatsend').prop("disabled", false); 
	}
    
});
socket.on('disconnect', data => {
    alertify.logPosition('bottom right')
	alertify
		.closeLogOnClick(true)
		.maxLogItems(1)
        .delay(0).error("Lost connection to server")
    $('#chatsend').prop("disabled", true); 
    console.debug('Lost connection, auto-reconnect in 10s');
    setTimeout(socket.connect(),10000)

});
socket.on('init',data => {
    rooms = data.channels;
    console.info(`Found ${rooms.length} channels`)
    const element = document.getElementById('channelList');
    updateChannelList()
})

socket.on('cmd',(data) => {
	if(data.type === "users") {
        return alert(`Users: ${data.msg.join(", ")}`)
    }
    return console.warn('Recieved an unknown command response from server');
});

socket.on('message', (data) => {
    console.log(data)
    let user = (data.server) ? '[Server]':data.user;
    document.title = '**New Chat Message**';
    setInterval(() => {
        document.title = title;
    },2500)
    if(!document.hasFocus() && !data.previous && document.readyState == 'complete') {
        if(settings.notifications && Notification.permission === 'granted') {
            if(settings.sounds) {
                new Notification(`${data.user||'[Server]'} on #${current_channel}`,{
                    body:data.message,
                    //badge:'/img/NullifySmall.jpg',
                    sound:'msg.mp3'
                });
            }else {
                new Notification(`${data.user||'[Server]'} on #${current_channel}`,{
                    body:data.message
                   // badge:'/img/NullifySmall.jpg'
                });
            }
            
        }
    }
	
    let className = (data.server) ? "list-group-item-info":(data.previous) ? 'list-group-item-secondary':'';
    if(data.server) {
        output.innerHTML += `<li class="list-group-item ${className} chat"><b class="mb-1">[Server]</b> ${data.message}</li>`;
        output.scrollTop = output.scrollHeight
        return;
    }
    let prevMsg = $('#chat_list li').last('li')[0];
    let message = markdown.makeHtml(data.message);
    message = message.replace(/\n/g,'<br>').replace(/(<\/?p>)/g,'').replace(/(<\/?h[1-6]>)/g,'').replace(/(href=['"](javascript|data|vbscript|file):)/,"href='#")
    .replace(/(img )/g,"img width='50px' height='50px' ")
    if(prevMsg && prevMsg.children && prevMsg.children[0].children.length > 0 && prevMsg.children[0].children[0].innerHTML === data.user) {
        prevMsg.lastChild.innerHTML += `\n<br>${message}`
        output.scrollTop = output.scrollHeight;
        return true;
    }
    let time = new Date(data.timestamp)
    const PMTime = time.getHours() >= 12
    time = `${time.getFullYear()}-${time.getMonth()}-${time.getDate()} at ${time.getHours() % 12}:${time.getMinutes().toString().padStart(2,0)} ${(!PMTime)?'AM':'PM'}`;
    output.innerHTML += `<li class="list-group-item ${className} flex-column align-items-start chat"><div class="d-flex w-100 justify-content-between"><b class="mb-1">${user}</b>  <small class="text-muted">${time}</small></div><p>${message}</p></li>`;
    output.scrollTop = output.scrollHeight
});
socket.on('usercount', data => {
	document.getElementById('connecteduserlist').innerHTML = "";
	for(var i=0;i<data.length;i++) {
		var li = document.createElement("li"); //create the LI
		li.setAttribute("class","list-group-item"); 
		if(data[i]['user'] !== "Server") {
			li.appendChild(document.createTextNode(data[i]['user']));
		}
		document.getElementById('connecteduserlist').append(li)
	}
	
	document.getElementById('usercount').innerHTML = data.length;
});
$(window).scroll(function(){
    if ($(window).scrollTop() == $(document).height()-$(window).height()){
        alert("We're at the bottom of the page!!");
    }
});