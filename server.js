//DIRTY ASS LAZY SERVER !
//Will do that properly someday :3
const statik = require('node-static');
const fs = require('fs');
const fileServer = new statik.Server('./dist');
const http = require('http');
const UrlParser = require('url');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const Ajv = require("ajv")
const JsonPatch = require('fast-json-patch');
const crypto = require('crypto');

const userDataFolder = "./userData/";
const credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8"));
let credentialToken = null;
let credentialToken_invalidation_date = 0;

console.log("==============");
console.log("Server started");
console.log("==============");

if(!fs.existsSync(userDataFolder)) {
	fs.mkdirSync(userDataFolder);
}

http.createServer((request, response) => {
    let body = "";
    request.on('readable', (r) =>{
        const data = request.read();
		if(data) body += data;
    });

	request.addListener('end', async () => {
		// console.log("CALL", request.method, request.url);
		if(request.method == "HEAD") {
			response.end();
			return;
		}
		
		if(request.method == "OPTIONS") {
			setHeaders(request, response);
			response.end("OK");
			return;
		}
		
		if(request.url.indexOf("/api") == 0) {
			setHeaders(request, response);
			const endpoint = request.url.replace(/\?.*/gi, "");
			
			//Get client ID
			if(endpoint == "/api/configs") {
				response.writeHead(200, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({
					client_id:credentials.client_id,
					scopes:credentials.scopes,
					spotify_scopes:credentials.spotify_scopes,
					spotify_client_id:credentials.spotify_client_id,
					deezer_scopes:credentials.deezer_scopes,
					deezer_client_id:credentials.deezer_client_id,
					deezer_dev_client_id:credentials.deezer_dev_client_id,
				}));
					return;
		
			//Get/Set user data
			}else if(endpoint == "/api/user") {
				userData(request, response, body);
				return;
		
			//Get current chatters
			}else if(endpoint == "/api/chatters") {
				getChatters(request, response, body);
				return;
			
			//Generate token from auth code
			}else if(endpoint == "/api/gettoken") {
				generateToken(request, response);
				return;
			
			//Generate token from auth code
			}else if(endpoint == "/api/CSRFToken") {
				CSRFToken(request, response);
				return;
			
			//Get fake chat events
			}else if(endpoint == "/api/fakeevents") {
				getFakeEvents(request, response);
				return;

			//Refresh access token
			}else if(endpoint == "/api/refreshtoken") {
				refreshToken(request, response);
				return;

			//Get users
			}else if(endpoint == "/api/users") {
				getUsers(request, response);
				return;

			//Get spotify token
			}else if(endpoint == "/api/spotify/auth") {
				spotifyAuthenticate(request, response);
				return;

			//Rrefresh spotify access_token
			}else if(endpoint == "/api/spotify/refresh_token") {
				spotifyRefreshToken(request, response);
				return;

			//Get deezer token
			}else if(endpoint == "/api/deezer/auth") {
				deezerAuthenticate(request, response);
				return;

			//Get deezer token
			}else if(endpoint == "/api/clip") {
				twitchClip(request, response);
				return;

			//Rrefresh deezer access_token
			// }else if(endpoint == "/api/deezer/search") {
			// 	const res = await fetch("https://api.deezer.com/search?q=prout", {
			// 		"headers": {
			// 			"accept": "*/*",
			// 		},
			// 		"body": null,
			// 		"method": "GET",
			// 	});
			// 	const json = await res.json();
			// 	console.log(json)
			// 	response.writeHead(200, {'Content-Type': 'application/json'});
			// 	response.end(JSON.stringify(json));
			// 	return;
			
			//Endpoint not found
			}else{
				response.writeHead(404, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({error: "This endpoint does not exist"}));
				return;
			}
		}else{
			await fileServer.serve(request, response, async (err, result) => {
				if (err) {
					if(request.url.toLowerCase().indexOf("oauth") == -1
					&& request.url.toLowerCase().indexOf("chat") == -1
					&& request.url.toLowerCase().indexOf("overlay") == -1
					&& request.url.toLowerCase().indexOf("spotify") == -1
					&& request.url.toLowerCase().indexOf("deezer") == -1
					&& request.url.toLowerCase().indexOf("sponsor") == -1
					&& request.url.toLowerCase().indexOf("logout") == -1
					&& request.url.toLowerCase().indexOf("login") == -1) {
						
						console.error(
							"Error serving " + request.headers.host+request.url + " - " + err.message
						);
					}

					// let page = request.url;
					// if(fs.existsSync("./dist/"+page)) {
					// 	fileServer.serveFile( page, 200, {}, request, response );
					// 	return;
					// }
					
					// page += ".html";
					// if(fs.existsSync("./dist/"+page)) {
					// 	fileServer.serveFile( page, 200, {}, request, response );
					// 	return;
					// }

					await fileServer.serveFile( '/index.html', 200, {}, request, response );
				}
			});
		}
	}).resume();
}).listen(3018);


function setHeaders(request, response) {
	if(request.headers.host
	&& (credentials.redirect_uri.indexOf(request.headers.host.replace(/:[0-9]+/gi, "")) > -1
		|| request.headers.host.indexOf("192.168") > -1)
	) {
		//Set CORS headers if host is found on the redirect URI
		response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS')
		response.setHeader('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,X-AUTH-TOKEN,Authorization');
		response.setHeader('Access-Control-Allow-Origin', "*");
	}
}

/**
 * Generates an access token from an auth code
 * 
 * @param {*} request 
 * @param {*} response 
 */
async function generateToken(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	
	let url = "https://id.twitch.tv/oauth2/token";
	url += "?client_id="+credentials.client_id;
	url += "&client_secret="+credentials.client_secret;
	url += "&code="+params.code;
	url += "&grant_type=authorization_code";
	url += "&redirect_uri="+credentials.redirect_uri;
	
	let json;
	try {
		let res = await fetch(url, {method:"POST"});
		json = await res.json();
	}catch(error) {
		console.log(error);
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:'error', success:false}));
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(json));
}

/**
 * Generates/verifies a CSRF token to secure twitch authentication
 * 
 * @param {*} request 
 * @param {*} response 
 */
async function CSRFToken(request, response) {
	if(request.method == "GET") {
		//Generate a token
		const token = jwt.sign({date:Date.now()}, credentials.csrf_key);
		response.writeHead(200, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({token}));
		return;

	}else if(request.method == "POST") {
		//Verifies a CSRF token
		const params = UrlParser.parse(request.url, true).query;
		const result = jwt.verify(params.token, credentials.csrf_key);
		if(result) {
			//Token valid only for 5 minutes
			if(result.date > Date.now() - 5*60*1000) {
				response.writeHead(200, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({success:true}));
			}else{
				//Token expired
				response.writeHead(200, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({success:false, message:"CSRF token expired, please try again"}));
			}
		}else{
			//Invalid token
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({success:false, message:"Invalid CSRF token"}));
		}
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify({success:false, message:"Unsupported method "+request.method}));
}

/**
 * Frefresh an access token
 * 
 * @param {*} request 
 * @param {*} response 
 */
async function refreshToken(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	
	let url = "https://id.twitch.tv/oauth2/token";
	url += "?client_id="+credentials.client_id;
	url += "&client_secret="+credentials.client_secret;
	url += "&refresh_token="+params.token;
	url += "&grant_type=refresh_token";
	
	let json;
	try {
		let res = await fetch(url, {method:"POST"});
		json = await res.json();
	}catch(error) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:'error', success:false}));
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(json));
}

/**
 * Get/set a user's data
 */
async function userData(request, response, body) {
	let userInfo = {};

	//Check access token validity
	const headers = { "Authorization": request.headers.authorization };
	const options = {
		method: "GET",
		headers: headers,
	};
	const result = await fetch("https://id.twitch.tv/oauth2/validate", options)
	if(result.status == 200) {
		userInfo = await result.json();
	}else{
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:"Invalid access token", success:false}));
		return;
	}

	//Get users' data
	const userFilePath = userDataFolder + userInfo.user_id+".json";
	if(request.method == "GET") {
		if(!fs.existsSync(userFilePath)) {
			response.writeHead(404, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({success:false}));
		}else{
			const data = fs.readFileSync(userFilePath, {encoding:"utf8"});
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({success:true, data:JSON.parse(data)}));
		}
	
	//Update users' data
	}else if(request.method == "POST") {
		try {
			body = JSON.parse(body);
		}catch(error) {
			response.writeHead(500, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({message:"Invalid body data", success:false}));
			return;
		}

		//avoid saving private data to server
		delete body.obsPass;
		delete body.oAuthToken;
		//Do not save this to the server to avoid config to be erased
		//on one of the instances
		delete body["p:hideChat"];
		
		// body.data["p:slowMode"] = true;//Uncomment to test JSON diff
	
		//Test data format
		try {
			const clone = JSON.parse(JSON.stringify(body));
			// fs.writeFileSync(userDataFolder+userInfo.user_id+"_full.json", JSON.stringify(clone), "utf8");
	
			//schemaValidator() is supposed to tell if the format is valid or not.
			//Because we enabled "removeAdditional" option, no error will be thrown
			//if a field is not in the schema. Instead it will simply remove it.
			//V9+ of the lib is supposed to allow us to retrieve the removed props,
			//but it doesn't yet. As a workaround we use JSONPatch that compares
			//the JSON before and after validation.
			//This is not the most efficient way to do this, but we have no much
			//other choice for now.
			schemaValidator(body);
			const diff = JsonPatch.compare(clone, body, false);
			if(diff?.length > 0) {
				console.log("Invalid format, some data has been removed from "+userInfo.login+"'s data");
				console.log(diff);
				fs.writeFileSync(userDataFolder+userInfo.user_id+"_cleanup.json", JSON.stringify(diff), "utf8");
			}
			fs.writeFileSync(userFilePath, JSON.stringify(body), "utf8");
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({success:true}));
		}catch(error){
			console.log(error);
			const message = schemaValidator.errors;
			console.log(message);
			response.writeHead(500, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({message, success:false}));
		}
	}

}

/**
 * Get user's chatters
 */
async function getChatters(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	const chattersRes = await fetch("https://tmi.twitch.tv/group/user/"+params.channel.toLowerCase()+"/chatters", {method:"GET"});
	let chatters = [];
	if(chattersRes.status === 200) {
		chatters = await chattersRes.json();
	}
	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(chatters));

}

/**
 * Get fake chat events
 */
async function getFakeEvents(request, response) {
	let json = {};
	if(fs.existsSync("fakeEvents.json")) {
		json = fs.readFileSync("fakeEvents.json", "utf8");
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(json);
}

/**
 * Get users list
 */
async function getUsers(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	//Missing token
	if(!params.token) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({success:false}));
		return;
	}
	//Check token
	const hash = crypto.createHash('sha256').update(credentials.csrf_key).digest("hex");
	if(hash != params.token.toLowerCase()){
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({success:false, message:"invalid token"}));
		return;
	}

	const files = fs.readdirSync(userDataFolder);
	const list = files.filter(v => v.indexOf("_cleanup") == -1);
	const users = []
	list.forEach(v => {
		users.push({
			id: v.replace(".json", ""),
			date:fs.statSync(userDataFolder + v).mtime.getTime()
		})
	} );

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify({success:true, users}));
}

/**
 * Authenticate a spotify user from its auth_code
 */
async function spotifyAuthenticate(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	let clientId = params.clientId? params.clientId : credentials.spotify_client_id;
	let clientSecret = params.clientSecret? params.clientSecret : credentials.spotify_client_secret;

	const options = {
		method:"POST",
		headers: {
			"Authorization": "Basic "+Buffer.from(clientId+":"+clientSecret).toString('base64'),
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			'grant_type': 'authorization_code',
			'code': params.code,
			'redirect_uri': credentials.spotify_redirect_uri,
		})
	}
	
	let json;
	try {
		let res = await fetch("https://accounts.spotify.com/api/token", options);
		json = await res.json();
	}catch(error) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:'error', success:false}));
		console.log(error);
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(json));
}

/**
 * Refreshes a spotify access token
 */
async function spotifyRefreshToken(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	let clientId = params.clientId? params.clientId : credentials.spotify_client_id;
	let clientSecret = params.clientSecret? params.clientSecret : credentials.spotify_client_secret;

	const options = {
		method:"POST",
		headers: {
			"Authorization": "Basic "+Buffer.from(clientId+":"+clientSecret).toString('base64'),
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			'grant_type': 'refresh_token',
			'refresh_token': params.token,
		})
	}
	
	let json;
	try {
		let res = await fetch("https://accounts.spotify.com/api/token", options);
		json = await res.json();
	}catch(error) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:'error', success:false}));
		console.log(error);
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(json));
}

/**
 * Authenticate a deezer user from its auth_code
 */
async function deezerAuthenticate(request, response) {
	let params = UrlParser.parse(request.url, true).query;

	const options = { method:"GET" }
	let json;
	try {
		const appId = params.isProd=="1"? credentials.deezer_client_id : credentials.deezer_dev_client_id;
		const secret = params.isProd=="1"? credentials.deezer_client_secret : credentials.deezer_dev_client_secret;
		let url = "https://connect.deezer.com/oauth/access_token.php";
		url += "?code="+params.code;
		url += "&secret="+secret;
		url += "&app_id="+appId;
		url += "&output=json";
		let res = await fetch(url, options);
		json = await res.json();

		if(!json.access_token) throw(json);
	}catch(error) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:'error', success:false}));
		console.log(error);
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify({
		refresh_token: json.access_token,
		expires_in: json.expires,
	}));
}

/**
 * Just a proxy to load a twitch clip player source page
 * [EDIT] actually not used as the actual video is loaded asynchronously
 *        after a GQL query. To get it we would have to create a headless
 *        browser, load the page, wait for the video to load, and get its URL.
 *        No way i do this on my small server :D
 * @param {*} request 
 * @param {*} response 
 * @returns 
 */
async function twitchClip(request, response) {
	const params = UrlParser.parse(request.url, true).query;
	const id = params.id;
	const res = await fetch("https://clips.twitch.tv/"+id);
	const html = await res.text();

	response.writeHead(200, {'Content-Type': 'text/html'});
	response.end(html);
}



/**
 * Data schema to make sure people don't send random or invalid data to the server
 */
const UserDataSchema = {
	type:"object",
	additionalProperties: false,
	properties:{
		activityFeedFilters: {
			type:"object",
			additionalProperties: false,
			properties: {
				sub:{
					type:"boolean",
				},
				follow:{
					type:"boolean",
				},
				bits:{
					type:"boolean",
				},
				raid:{
					type:"boolean",
				},
				rewards:{
					type:"boolean",
				},
				poll:{
					type:"boolean",
				},
				prediction:{
					type:"boolean",
				},
				bingo:{
					type:"boolean",
				},
				raffle:{
					type:"boolean",
				}
			}
		},
		obsConf_muteUnmute: {
			type:"object",
			properties: {
				audioSourceName:{type:"string"},
				muteCommand:{type:"string"},
				unmuteCommand:{type:"string"},
			}
		},
		obsConf_permissions: {
			type:"object",
			additionalProperties: false,
			properties: {
				mods: {type:"boolean"},
				vips: {type:"boolean"},
				subs: {type:"boolean"},
				all: {type:"boolean"},
				users: {type:"string", maxLength:1000},
			}
		},
		obsConf_scenes: {
			type:"array",
			items:[
				{
					type:"object",
					additionalProperties: false,
					properties:{
						scene: 
						{
							type:"object",
							additionalProperties: false,
							properties:{
								sceneIndex:{type:"integer"},
								sceneName:{type:"string", maxLength:100},
							}
						},
						command:{type:"string", maxLength:100},
					}
				}
			]
		},
		triggers: {
			type:["object"],
			additionalProperties: true,
			patternProperties: {
				".*": {
					type: "object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						chatCommand: {type:"string", maxLength:100},
						permissions: {
							type:"object",
							properties: {
								mods: {type:"boolean"},
								vips: {type:"boolean"},
								subs: {type:"boolean"},
								all: {type:"boolean"},
								users: {type:"string", maxLength:1000},
							}
						},
						cooldown: {
							type:"object",
							properties: {
								global: {type:"number", minimum:0, maximum:60*60*12},
								user: {type:"number", minimum:0, maximum:60*60*12},
							}
						},
						actions:{
							type:"array",
							items: [
								{
									type: "object",
									additionalProperties: false,
									properties: {
										id: {type:"string", maxLength:100},
										sourceName: {type:"string", maxLength:100},
										show: {type:"boolean"},
										delay: {type:"number"},
										filterName: {type:"string", maxLength:100},
										text: {type:"string", maxLength:500},
										url: {type:"string", maxLength:1000},
										mediaPath: {type:"string", maxLength:1000},
										type: {type:"string", maxLength:50},
										musicAction: {type:"string", maxLength:3},
										track: {type:"string", maxLength:500},
										confirmMessage: {type:"string", maxLength:500},
									}
								},
							]
						}
					}
				},
			}
		},
		botMessages: {
			type:"object",
			additionalProperties: false,
			properties: {
				raffleStart: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:1000},
					}
				},
				raffleJoin: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:1000},
					}
				},
				raffle: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:1000},
					}
				},
				bingoStart: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:1000},
					}
				},
				bingo: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:1000},
					}
				},
				shoutout: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:1000},
					}
				},
			}
		},
		"streamInfoPresets":{
			type:"array",
			items:[
				{
					type:"object",
					additionalProperties: false,
					properties:{
						name:{type:"string", maxLength:50},
						id:{type:"string", maxLength:10},
						title:{type:"string", maxLength:200},
						categoryID:{type:"string", maxLength:10},
						tagIDs:{
							type:"array",
							items:[{type:"string", maxLength:50}],
						},
					}
				}
			]
		},
		"p:blockedCommands": {type:"string"},
		"p:bttvEmotes": {type:"boolean"},
		"p:ffzEmotes": {type:"boolean"},
		"p:sevenTVEmotes": {type:"boolean"},
		"p:censorDeletedMessages": {type:"boolean"},
		"p:censoreDeletedMessages": {type:"boolean"},
		"p:conversationsEnabled": {type:"boolean"},
		"p:defaultSize": {type:"integer", minimum:0, maximum:5},
		"p:displayTime": {type:"boolean"},
		"p:firstMessage": {type:"boolean"},
		"p:firstTimeMessage": {type:"boolean"},
		"p:groupIdenticalMessage": {type:"boolean"},
		"p:hideUsers": {type:"string"},
		"p:highlightMentions": {type:"boolean"},
		"p:highlightMods": {type:"boolean"},
		"p:highlightNonFollowers": {type:"boolean"},
		"p:highlightSubs": {type:"boolean"},
		"p:highlightVips": {type:"boolean"},
		"p:historySize": {type:"integer", minimum:50, maximum:500},
		"p:ignoreCommands": {type:"boolean"},
		"p:ignoreListCommands": {type:"boolean"},
		"p:keepDeletedMessages": {type:"boolean"},
		"p:keepHighlightMyMessages": {type:"boolean"},
		"p:lockAutoScroll": {type:"boolean"},
		"p:markAsRead": {type:"boolean"},
		"p:minimalistBadges": {type:"boolean"},
		"p:notifyJoinLeave": {type:"boolean"},
		"p:raidHighlightUser": {type:"boolean"},
		"p:raidStreamInfo": {type:"boolean"},
		"p:receiveWhispers": {type:"boolean"},
		"p:showBadges": {type:"boolean"},
		"p:showBots": {type:"boolean"},
		"p:showCheers": {type:"boolean"},
		"p:showEmotes": {type:"boolean"},
		"p:showFollow": {type:"boolean"},
		"p:showHypeTrain": {type:"boolean"},
		"p:showModTools": {type:"boolean"},
		"p:splitViewVertical": {type:"boolean"},
		"p:showWhispersOnChat": {type:"boolean"},
		"p:showNotifications": {type:"boolean"},
		"p:showRaids": {type:"boolean"},
		"p:showRewards": {type:"boolean"},
		"p:showRewardsInfos": {type:"boolean"},
		"p:showSelf": {type:"boolean"},
		"p:showSlashMe": {type:"boolean"},
		"p:showSubs": {type:"boolean"},
		"p:showUserPronouns": {type:"boolean"},
		"p:showViewersCount": {type:"boolean"},
		"p:splitView": {type:"boolean"},
		"p:splitViewSwitch": {type:"boolean"},
		"p:stopStreamOnRaid": {type:"boolean"},
		"p:userHistoryEnabled": {type:"boolean"},
		"p:translateNames": {type:"boolean"},
		"p:ttsEnabled": {type:"boolean"},
		"p:volume": {type:"number", minimum:0, maximum:1},
		"p:rate": {type:"number", minimum:0.1, maximum:10},
		"p:pitch": {type:"number", minimum:0, maximum:2},
		"p:voice": {type:"string"},
		"p:ttsRemoveEmotes": {type:"boolean"},
		"p:speakPatternmessage": {type:"string"},
		"p:speakPatternwhisper": {type:"string"},
		"p:speakPatternnotice": {type:"string"},
		"p:maxLength": {type:"integer", minimum:0, maximum:2000},
		"p:timeout": {type:"integer", minimum:0, maximum:300},
		"p:removeURL": {type:"boolean"},
		"p:replaceURL": {type:"string"},
		"p:inactivityPeriod": {type:"integer", minimum:0, maximum:60},
		"p:speakRewards": {type:"boolean"},
		"p:speakSubs": {type:"boolean"},
		"p:speakBits": {type:"boolean"},
		"p:speakRaids": {type:"boolean"},
		"p:speakFollow": {type:"boolean"},
		"p:speakPolls": {type:"boolean"},
		"p:speakPredictions": {type:"boolean"},
		"p:speakBingos": {type:"boolean"},
		"p:speakRaffle": {type:"boolean"},
		"p:tts_mods": {type:"boolean"},
		"p:tts_vips": {type:"boolean"},
		"p:tts_subs": {type:"boolean"},
		"p:tts_all": {type:"boolean"},
		"p:tts_users": {type:"string"},


		"p:spoilersEnabled": {type:"boolean"},
		"p:alertMode": {type:"boolean"},
		v: {type:"integer"},
		obsIP: {type:"string"},
		obsPort: {type:"integer"},
		updateIndex: {type:"integer"},
		raffle_message: {type:"string"},
		raffle_messageEnabled: {type:"boolean"},
		bingo_message: {type:"string"},
		bingo_messageEnabled: {type:"boolean"},
		greetScrollDownAuto: {type:"boolean"},
		greetAutoDeleteAfter: {type:"integer", minimum:-1, maximum:3600},
		devmode: {type:"boolean"},
		greetHeight: {type:"number"},
		cypherKey: {type:"string"},
		raffle_showCountdownOverlay: {type:"boolean"},
		"p:emergencyButton": {type:"boolean"},//Keep it a little to avoid loosing data, remove it later
		emergencyParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled:{type:"boolean"},
				chatCmd:{type:"string", maxLength:100},
				chatCmdPerms:{
					type:"object",
					additionalProperties: false,
					properties: {
						mods: {type:"boolean"},
						vips: {type:"boolean"},
						subs: {type:"boolean"},
						all: {type:"boolean"},
						users: {type:"string", maxLength:1000},
					}
				},
				slowMode:{type:"boolean"},
				emotesOnly:{type:"boolean"},
				subOnly:{type:"boolean"},
				followOnly:{type:"boolean"},
				noTriggers:{type:"boolean"},
				followOnlyDuration:{type:"number"},
				slowModeDuration:{type:"number"},
				toUsers:{type:"string"},
				obsScene:{type:"string"},
				obsSources:{
					type:"array",
					items:[{type:"string", maxLength:100}],
				},
				autoBlockFollows:{type:"boolean"},
				autoUnblockFollows:{type:"boolean"},
			}
		},
		emergencyFollowers: {
			type:"object",
			additionalProperties: false,
			properties: {
				uid:{type:"string", maxLength:50},
				login:{type:"string", maxLength:50},
				date:{type:"number"},
				blocked:{type:"boolean"},
				unblocked:{type:"boolean"},
			}
		},
		spoilerParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				permissions:{
					type:"object",
					additionalProperties: false,
					properties: {
						mods: {type:"boolean"},
						vips: {type:"boolean"},
						subs: {type:"boolean"},
						all: {type:"boolean"},
						users: {type:"string", maxLength:1000},
					}
				},
			}
		},
		chatHighlightParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				position:{type:"string", maxLength:2},
			}
		},
		
		chatAlertParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				chatCmd:{type:"string", maxLength:100},
				message: {type:"boolean"},
				shake: {type:"boolean"},
				sound: {type:"boolean"},
				blink: {type:"boolean"},
				permissions:{
					type:"object",
					additionalProperties: false,
					properties: {
						mods: {type:"boolean"},
						vips: {type:"boolean"},
						subs: {type:"boolean"},
						all: {type:"boolean"},
						users: {type:"string", maxLength:1000},
					}
				},
			}
		},
		
		musicPlayerParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				autoHide: {type:"boolean"},
				erase: {type:"boolean"},
				showCover: {type:"boolean"},
				showArtist: {type:"boolean"},
				showTitle: {type:"boolean"},
				showProgressbar: {type:"boolean"},
				openFromLeft: {type:"boolean"},
			}
		},
	}
}

const ajv = new Ajv({strictTuples: false, verbose:true, removeAdditional:true, discriminator:true })
const schemaValidator = ajv.compile( UserDataSchema );