let switchedChannelUsed = false; 

function switchChannel(channel) {
    current_channel = channel;
    if(switchedChannelUsed) {
        document.getElementById('chat_list').innerHTML = '';
    }else{
        switchedChannelUsed = true;
    }
    socket.emit('channelSwitch',channel)
    $('#info').html(`<b>@${user}</b><br>#${channel}`);
    document.getElementById('chatsend').placeholder = `Send a message to #${channel}`
    setCookie('lastChannel',channel);
    updateChannelList();
    return true;
}
function updateChannelList() {
    const element = document.getElementById('channelList')
    document.getElementById('channelList').innerHTML = "";
    rooms.forEach(v => {
        if(current_channel === v) {
            return element.innerHTML += `<a class="list-group-item channel list-group-item-action list-group-item-primary current" href='#'>#${v}</a>`
        }
        element.innerHTML += `<a class="list-group-item list-group-item-action channel" href="#" onClick="switchChannel('${v}')">#${v}</a>`
    })
}
async function sendMessage(message,toSelf) {
    if(toSelf) {
        message = escapeHtml(message)
        message = markdown.makeHtml(message).replace(/\n/g,'<br>').replace(/(<\/?p>)/g,'').replace(/(<\/?h[1-6]>)/g,'').replace(/(href=['"](javascript|data|vbscript|file):)/,"href='#")
        .replace(/(img )/g,"img width='50px' height='50px' ");
        document.getElementById('chat_list').innerHTML +=
        `<li class="list-group-item list-group-item-primary flex-column align-items-start chat"><p>${message}</p></li>`;
    document.getElementById('chat_list').scrollTop = document.getElementById('chat_list').scrollHeight;
        return;
    }
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
        return;
    }
    //message = escapeHtml(message.trim())
    //message = message = message.replace(/<[^>]+>/g, '');
    socket.emit('message',message); //send data to server (could broadcast eh)
    let prevMsg = $('#chat_list li').last('')[0];
    message = escapeHtml(message)
    message = markdown.makeHtml(message).replace(/\n/g,'<br>').replace(/(<\/?p>)/g,'').replace(/(<\/?h[1-6]>)/g,'').replace(/(href=['"](javascript|data|vbscript|file):)/,"href='#")
    .replace(/(img )/g,"img width='50px' height='50px' ");
    if(prevMsg && prevMsg.children && prevMsg.children[0].children.length > 0 && prevMsg.children[0].children[0].innerHTML === user) {
        prevMsg.lastChild.innerHTML += `\n<br>${message}`
        output.scrollTop = output.scrollHeight;
        return true;
    }
    
    document.getElementById('chat_list').innerHTML +=
    `<li class="list-group-item list-group-item-success flex-column align-items-start chat"><div class="d-flex w-100 justify-content-between"><b class="mb-1">${user}</b> <small class="text-muted">now</small></div><p>${message}</p></li>`;
    document.getElementById('chat_list').scrollTop = document.getElementById('chat_list').scrollHeight;
    return true;
}
function processCommand(cmd,args) {
    cmd = cmd.trim()
    switch(cmd) {
        case "users":
            return socket.emit('cmd','users')
            break;
        case "tableflip":
            msg = args.join(" ");
            return sendMessage(`${msg} (╯°□°）╯︵ ┻━┻`)
            break;
        case "unflip":
            msg = args.join(" ");
            return sendMessage(`${msg} ┬─┬﻿ ノ( ゜-゜ノ)`)
            break;
        case "shrug":
            msg = args.join(" ");
            return sendMessage(`${msg} \¯\\_(ツ)_/¯`)
            break;
        case "rainbow":
            return setInterval(() => {
                $('*').addClass('rainbow')
            },1000);
            break;
        case "help":
            return sendMessage('/tableflip - (╯°□°）╯︵ ┻━┻\n/unflip ┬─┬﻿ ノ( ゜-゜ノ)\n/shrug \¯\\_(ツ)_/¯\n/rainbow',true)
            break;
    }
}
function autoSave() {
    settings.compactMode = $('#settings_compact').prop('checked')
    settings.notifications = $('#settings_notifications').prop('checked');
    settings.sounds = $('#settings_sounds').prop('checked');
    setCookie('settings',JSON.stringify(settings),365);
    setTimeout(autoSave,60000);
}

function toggleNav(element,amount) {
    let e = document.getElementById(element);
    if(e.style.width === "0px" || !e.style.width) {
        return e.style.width = `${amount|250}px`;
    }
    e.style.width = "0";
}
function escapeHtml(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
function botCheck(){
	const botPattern = "(googlebot\/|Googlebot-Mobile|Googlebot-Image|Google favicon|Mediapartners-Google|bingbot|slurp|java|wget|curl|Commons-HttpClient|Python-urllib|libwww|httpunit|nutch|phpcrawl|msnbot|jyxobot|FAST-WebCrawler|FAST Enterprise Crawler|biglotron|teoma|convera|seekbot|gigablast|exabot|ngbot|ia_archiver|GingerCrawler|webmon |httrack|webcrawler|grub.org|UsineNouvelleCrawler|antibot|netresearchserver|speedy|fluffy|bibnum.bnf|findlink|msrbot|panscient|yacybot|AISearchBot|IOI|ips-agent|tagoobot|MJ12bot|dotbot|woriobot|yanga|buzzbot|mlbot|yandexbot|purebot|Linguee Bot|Voyager|CyberPatrol|voilabot|baiduspider|citeseerxbot|spbot|twengabot|postrank|turnitinbot|scribdbot|page2rss|sitebot|linkdex|Adidxbot|blekkobot|ezooms|dotbot|Mail.RU_Bot|discobot|heritrix|findthatfile|europarchive.org|NerdByNature.Bot|sistrix crawler|ahrefsbot|Aboundex|domaincrawler|wbsearchbot|summify|ccbot|edisterbot|seznambot|ec2linkfinder|gslfbot|aihitbot|intelium_bot|facebookexternalhit|yeti|RetrevoPageAnalyzer|lb-spider|sogou|lssbot|careerbot|wotbox|wocbot|ichiro|DuckDuckBot|lssrocketcrawler|drupact|webcompanycrawler|acoonbot|openindexspider|gnam gnam spider|web-archive-net.com.bot|backlinkcrawler|coccoc|integromedb|content crawler spider|toplistbot|seokicks-robot|it2media-domain-crawler|ip-web-crawler.com|siteexplorer.info|elisabot|proximic|changedetection|blexbot|arabot|WeSEE:Search|niki-bot|CrystalSemanticsBot|rogerbot|360Spider|psbot|InterfaxScanBot|Lipperhey SEO Service|CC Metadata Scaper|g00g1e.net|GrapeshotCrawler|urlappendbot|brainobot|fr-crawler|binlar|SimpleCrawler|Livelapbot|Twitterbot|cXensebot|smtbot|bnf.fr_bot|A6-Indexer|ADmantX|Facebot|Twitterbot|OrangeBot|memorybot|AdvBot|MegaIndex|SemanticScholarBot|ltx71|nerdybot|xovibot|BUbiNG|Qwantify|archive.org_bot|Applebot|TweetmemeBot|crawler4j|findxbot|SemrushBot|yoozBot|lipperhey|y!j-asr|Domain Re-Animator Bot|AddThis)";
	let re = new RegExp(botPattern, 'i');
	const userAgent = navigator.userAgent;
	if (re.test(userAgent)) {
		return true;
	}else{
		return false;
	}
}

function notificationEnable() {
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notification");
        return false;
    }else if (Notification.permission === "granted") {
        // If it's okay let's create a notification
        return true;
    }

    // Otherwise, we need to ask the user for permission
    else if (Notification.permission !== "denied") {
        Notification.requestPermission(function (permission) {
        // If the user accepts, let's create a notification
        if (permission === "granted") {
             return true;
        }

        });
    }
    return false;
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
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

$("#chatsend").on('keyup', e => {
    console.log('send')
    const element = document.getElementById('chatsend');
    setTimeout(function(){
        element.style.cssText = 'height:auto; padding:0';
        element.style.cssText = 'height:' + element.scrollHeight + 'px';
    },0);
	if (e.keyCode == 13 && !e.shiftKey && user !== undefined) {
        if(element.value.trim().length === 0) return;
        sendMessage(element.value)
		element.value = "";
	}
});