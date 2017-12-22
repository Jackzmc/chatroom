const express = require('express');  
const exphbs = require('express-handlebars');
const path = require('path');

const config = require('./config');
const package = require('./package')
//const config = require('config/' + (((process.env.NODE_ENV !== 'production')) ? 'dev.json' : 'production.json'));

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
app.use(express.static(__dirname + '/public'));
app.use('/',(req,res) => {
	//let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	res.render('index',{version:package.version})
})

app.get('*', function(req, res){
    res.status(404).render('errors/404',{path:req.path,layout:false})
});

let available_rooms = ["general","test"];
const chat = {
	general:{
		users:[],
		messages:[]
	}
}
const users = [];
io.sockets.on('connection', function (socket) { //server connection, not user connection(i think)
	socket.on('channelSwitch',(room) => {
		if(available_rooms.indexOf(room) !== -1) {
			socket.leave(socket.room);
			socket.join(room)
			socket.room = room;
			console.info(`[Log] ${socket.username} switched to #${room}`)
			if(available_rooms[socket.room] && !chat[socket.room]) {
				chat[socket.room] = {users:[],messages:[]};
				return socket.emit('message',{server:true,message:`Connected to #${room}`});
			}
			const lastmessages = chat[socket.room].messages.slice(chat[socket.room].messages.length - 5)
			lastmessages.forEach(v => {
				socket.emit('message',v)
			})
			

			socket.emit('message',{server:true,message:`Connected to #${room}`})
			
		}
		return;
	});
	socket.on('join',function(data) {
		data = escapeHtml(data);
		socket.username = data;
		users.push({
			user: data,
			id: socket.id
		});

		console.log(`[Log] ${data} joined`);
		if(!socket.room || !available_rooms[socket.room]) return;
		
		socket.emit('usercount',users);
		
		//socket.broadcast.emit('message',data); //broadcast message that user joined (client will do it for themselves)
		//disabled above, due to connected user list
		
	});
  socket.on('message', function (message) { //get message from client, broadcast back to client... now that i realize it... i could just done broadcast clientside, but eh?
		if(message.trim().length === 0) return false;
		message = message.trim().slice(0,1000)
		message = escapeHtml(message);
		if(socket.username.toLowerCase() !== "server") {
			if(available_rooms[socket.room] && !chat[socket.room]) {
				chat[socket.room] = {users:[],messages:[]};
			}
			chat[socket.room].messages.push({
				user:socket.username,
				message,
				timestamp:new Date()
			})
			socket.broadcast.to(socket.room).emit('message',{user:socket.username,message,timestamp:new Date()})
			//chat.push(data); //stores message into variable that will reset on reload of node, currently only used for the last 5 messages on new user... should probably delete old ones... later
		}
		//socket.broadcast.emit('message',data);
  });
	socket.on('cmd', function (data) {
		console.info(`[Cmd] ${data}`)
		var callback = {};
		if(data == "users") {
			callback.type = "users";
			callback.msg = users;
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
	console.log(`[Log] ${socket.username} left`);
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