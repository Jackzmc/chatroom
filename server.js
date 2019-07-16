const express = require('express');  
const exphbs = require('express-handlebars');
const favicon = require('serve-favicon');
const path = require('path');
const fs = require('fs')

const config = require('./config.json');
const changelog = require('./changelog')
const package = require('./package');
//const config = require('config/' + (((process.env.NODE_ENV !== 'production')) ? 'dev.json' : 'production.json'));
const {r} = require('./modules/utils.js');

const app = express();  
const server = app.listen(config.port,() => {
	console.info(`[Server] Running on port ${config.port}`)
});
const io = require('socket.io').listen(server);

app.engine('.hbs', exphbs({
    // Specify helpers which are only registered on this instance.
    helpers: {
        parseConfig: (v) => { return v.replace(/\n/g, "<br />"); },
    },
    layoutDir:path.join(__dirname, 'views/layouts'),
    partialsDir:[path.join(__dirname, 'views/partials')],
    extname:'.hbs'
}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', '.hbs');
app.use((error, req, res, next) => {
    if(process.env.NODE_ENV === 'production' || config.error_level === 0) {
        return res.status(500).render('errors/general')
    }else if(config.error_level === 2) {
        console.error(error.stack)
        return res.status(500).render('errors/general',{error,debug:true})
    }
    console.error(error.message)
    res.status(500).render('errors/general',{error:error.message,default:true})
})
if(config.favicon && fs.existsSync(path.join(__dirname,'public',config.favicon))) app.use(favicon(path.join(__dirname, 'public', config.favicon)))
app.use(express.static(__dirname + '/public'));
app.use('/',(req,res) => {
	//let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	const changes = changelog[changelog.length-1].changes.map(v => `<li>${v}</li>`).join("\n")
	res.render('index',{version:package.version,changes,favicon:config.favicon,info:config.info})
})

app.get('*', function(req, res){
    res.status(404).render('errors/404',{path:req.path,layout:false})
});
const available_rooms = config.channels;

/*
Chat DB
{
	channel:'name',
	user:'nickname',
	timestamp:Date.now(),
	message:'message here'
}
*/
let users = [];
const spamCheck = [];
/* example 
{
	name:user,
	lastmsg;new Date()
}
check if lastmsg < new Date() and some type of count
*/
io.sockets.on('connection', function (socket) { //server connection, not user connection(i think)
	socket.emit('init',{
		default_channel:available_rooms[0],
		channels:available_rooms
	})
	socket.on('channelSwitch',async (room) => {
		if(available_rooms.indexOf(room) !== -1) {
			socket.leave(socket.room);
			socket.join(room)
			socket.room = room;
			if(available_rooms.indexOf(socket.room) === -1) return socket.emit('message',{server:true,error:true,message:'Specified channel does not exist'});
			if(config.debug.channelSwitch) console.info(`[Log] ${socket.username} switched to #${room}`)

			let lastMessages = await r.table('chatroom').orderBy('timestamp').filter({channel:socket.room}).limit(5)
			if(!lastMessages || lastMessages.length === 0) return socket.emit('message',{server:true,message:`Welcome to #${room}, there are no previous messages.`});
			
			lastMessages.forEach(v => {
				v.previous = true;
				socket.emit('message',v)
			})
		}
		return;
	});
	socket.on('join',function(data) {
		data = escapeHtml(data);
		socket.username = data;
		let prevUser = users.filter(v=> socket.id === v.id);
		if(prevUser.length > 0) {
			return socket.emit('message',{
				server:true,
				message:'You have already joined. Stop it.'
			})
		}
		users.push({
			user: data,
			id: socket.id
		});

		if(config.debug.joinquits) console.log(`[Log] ${data} joined`);
		if(!socket.room || !available_rooms[socket.room]) return;
		socket.emit('usercount',users);
		
		//socket.broadcast.emit('message',data); //broadcast message that user joined (client will do it for themselves)
		//disabled above, due to connected user list
		
	});
  	socket.on('message', async (message) => { //get message from client, broadcast back to client... now that i realize it... i could just done broadcast clientside, but eh?
		if(message.trim().length === 0) return false;
		message = message.trim().slice(0,1000)
		message = escapeHtml(message)
		if(socket.username.toLowerCase() !== "server") {
			if(!available_rooms.includes(socket.room)) {
				socket.room = available_rooms[0];
				return socket.emit('message',{server:true,message:'Channel does not exist!'});			
			}
			await r.table('chatroom').insert({
				user:socket.username,
				channel:socket.room,
				message,
				timestamp:Date.now()
			})
			socket.broadcast.to(socket.room).emit('message',{user:socket.username,message,timestamp:Date.now})
			//chat.push(data); //stores message into variable that will reset on reload of node, currently only used for the last 5 messages on new user... should probably delete old ones... later
		}
		//socket.broadcast.emit('message',data);
  });
	socket.on('cmd', function (data) {
		console.info(`[Cmd] ${data}`)
		var callback = {};
		if(data == "users") {
			callback.type = "users";
			callback.msg = users.map(v => v.user);
			socket.emit('cmd',callback);
		}else{
			callback.type = "error";
			callback.msg = "invalid";
			socket.emit('cmd',callback);
		}
  });
	
  socket.on('disconnect', function (data) {
	const i = users.indexOf({
		user: data,
		id: socket.id
	});
	users.splice(i, 1);
	if(!socket.username) return;
	if(config.debug.joinquits) console.log(`[Log] ${socket.username} left`);
	//socket.broadcast.emit('message',data); //broadcast leave message
	//disabled above, due to connected user list
  });
});

setInterval(function() { //every 5s, send user amount to all users
	io.sockets.emit('usercount',users);
},5000);

function escapeHtml(text) {
	return text
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/"/g, "&quot;")
	.replace(/'/g, "&#039;");
}


const encryption = {
	encode: (stringToBeEncrypted) => {
		const key = this.randomString(20,true);
		const cipher = crypto.createCipher('aes256', key);
		let encryptedString = cipher.update(stringToBeEncrypted, 'utf8', 'hex');

		encryptedString += cipher.final('hex');
		return {
			msg,
			key
		};
	},
	decode: (stringToBeDecrypted, key) => {
		const decipher = crypto.createDecipher('aes256', key);
		let decryptedString = decipher.update(stringToBeDecrypted, 'hex', 'utf8');
		const finalDecryptedString = decryptedString += decipher.final('utf8');
		return finalDecryptedString;
	},
	randomString: (stringLength,password) => {
		const possible = (password) ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()+_-=}{[]|:;"/?.><,`~' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		return new Array(stringLength).fill(1).reduce(previousValue => previousValue +possible.charAt(Math.floor(Math.random() * possible.length)),'');
	} 
}
function randomNumber(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}