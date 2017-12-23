
const output = document.getElementById('chat_list');
const notification = new Audio('/msg.mp3')
const markdown = new showdown.Converter({
    noHeaderId:true,
    //simplifiedAutoLink:true,
    headerLevelStart:6,
    emoji:true,
    strikethrough:true
});
const socket = io.connect({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax : 5000,
    reconnectionAttempts: 99999
}); //Connect to server
alertify.parent(document.getElementById('alertify-logs'))
let user;
let connectedbefore = false; //check if user has been actually connected before (or HAS joined)
let settings = {
    sounds:true,
    compactMode:false
}
let current_channel = "general";

$(document).ready(() => {  //get user logged in
	//var userp = prompt("Please choose a username");
    user = chance.first();
    socket.emit('join',user)
    socket.emit('channelSwitch',current_channel);
    alertify.logPosition('bottom right')
    alertify.success(`You have joined #${current_channel}`);
	$('#info').html(`<b>@${user}</b><br>#${current_channel}`);
    connectedBefore = true;
    

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
        return;
	}
    
});
socket.on('disconnect', data => {
    alertify.logPosition('bottom right')
	alertify
		.closeLogOnClick(true)
		.maxLogItems(1)
        .delay(0).error("Lost connection to server")
    $('#chatsend').prop("disabled", true); 
    setTimeout(window.location.reload(),5000)

});

/*logged in part */

$("#chatsend").on('keyup', e => {
	if (e.keyCode == 13 && user !== undefined) {
        if(document.getElementById('chatsend').value.trim().length === 0) return;
        sendMessage(document.getElementById('chatsend').value)
		document.getElementById('chatsend').value = "";
	}
});
// creating a new websocket

// on every message recived we print the new datas inside the #container div
socket.on('cmd',(data) => {
	if(data.type === "users") {
        return alert(`Users: ${data.msg.join(", ")}`)
    }
    return console.warn('Recieved an unknown command response from server');
});
socket.on('message', (data) => {
    console.log(data)
    if(!window.onfocus && !data.previous && document.readyState == 'complete' && settings.sounds) {
        notification.play(); //revamp to not go off when reconnecting
    }
	let user = (data.server) ? '[Server]':data.user;
    let className = (data.server) ? "list-group-item-info":(data.previous) ? 'list-group-item-secondary':'';
    if(data.server) {
        output.innerHTML += `<li class="list-group-item chat ${className}"><b class="mb-1">[Server]</b> ${data.message}</li>`;
        output.scrollTop = output.scrollHeight
        return;
    }
    data.message = escapeHtml(data.message);
    let time = new Date(data.timestamp)
    output.innerHTML += `<li class="list-group-item ${className} chat flex-column align-items-start"><div class="d-flex w-100 justify-content-between"><b class="mb-1">${user}</b>  <small class="text-muted">${time}</small></div>${markdown.makeHtml(data.message)}</li>`;
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
function switchChannel(channel) {
    console.warn('Not available');
    return false;
}
async function sendMessage(message) {
    if(message.trim().length <= 0) return false;
    if(message.length > 1000) {
        console.warn('Message is too long, max 2000 characters');
        alert('Your message is too long, nerd. Reduce it to 2000 or less, or else.');
        return false;
    }
    if(message.charAt(0) == "/") {
        //command
        let args = message.split(/ +/g)
        let command = args[0].replace('/','').toLowerCase();
        args = args.slice(1);
        let response = await processCommand(command,args);

        if(response) return response;
    }
    //message = escapeHtml(message.trim())
    //message = message = message.replace(/<[^>]+>/g, '');
    socket.emit('message',message); //send data to server (could broadcast eh)
    document.getElementById('chat_list').innerHTML +=
    `<li class="list-group-item chat list-group-item-success flex-column align-items-start"><div class="d-flex w-100 justify-content-between"><b class="mb-1">${user}</b> <small class="text-muted">now</small></div>${markdown.makeHtml(message)}</li>`;
    output.scrollTop = output.scrollHeight;
    return true;
}
function processCommand(cmd,args) {
	if(cmd == "users") {
		return socket.emit('cmd','users');
    }else if(cmd === "tableflip") {
        let msg = args.join(" ");
        msg = `${msg} (╯°□°）╯︵ ┻━┻`
        return sendMessage(msg);
    }else if(cmd === "unflip"){
        let msg = args.join(" ");
        msg = `${msg} ┬─┬﻿ ノ( ゜-゜ノ)`
        return sendMessage(msg);
    }else if(cmd === "shrug") {
        let msg = args.join(" ");
        msg = `${msg} \¯\\_(ツ)_/¯`
        return sendMessage(msg);
    }
}

function escapeHtml(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function toggleNav(element) {
    let e = document.getElementById(element);
    console.log(e.style.width)
    if(e.style.width === "0px") {
        return e.style.width = "250px";
    }
    e.style.width = "0";
}