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

const userDataFolder = "./userData/";
const credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8"));
let credentialToken = null;
let credentialToken_invalidation_date = 0;

console.log("=============");
console.log("Server stated");
console.log("=============");

if(!fs.existsSync(userDataFolder)) {
	fs.mkdirSync(userDataFolder);
}

http.createServer((request, response) => {
    let body = "";
    request.on('readable', (r) =>{
        const data = request.read();
		if(data) body += data;
    });

	request.addListener('end', () => {
		if(request.headers.host && credentials.redirect_uri.indexOf(request.headers.host.replace(/:[0-9]+/gi, "")) > -1) {
			//Set CORS headers if host is found on the redirect URI
			response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS')
			response.setHeader('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,X-AUTH-TOKEN');
			response.setHeader('Access-Control-Allow-Origin', "*");
		}
		if(request.method == "OPTION") {
			response.end("OK");
			return;
		}
		if(request.url.indexOf("api") > -1) {
			
			//Get client ID
			if(request.url.indexOf("api/configs") > -1) {
				response.writeHead(200, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({client_id:credentials.client_id, scopes:credentials.scopes}));
				return;
		
			//Get/Set user data
			}else if(request.url.indexOf("api/user") > -1) {
				userData(request, response, body);
				return;
			
			//Generate token from auth code
			}else if(request.url.indexOf("api/gettoken") > -1) {
				generateToken(request, response);
				return;
			
			//Generate token from auth code
			}else if(request.url.indexOf("api/CSRFToken") > -1) {
				CSRFToken(request, response);
				return;
			
			//Get fake chat events
			}else if(request.url.indexOf("api/fakeevents") > -1) {
				getFakeEvents(request, response);
				return;

			//Refresh access token
			}else if(request.url.indexOf("api/refreshtoken") > -1) {
				refreshToken(request, response);
				return;
			
				//Endpoint not found
			}else{
				response.writeHead(404, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({error: "This endpoint does not exist"}));
				return;
			}
		}else{
			fileServer.serve(request, response, (err, result) => {
				if (err) {
					if(request.url.toLowerCase().indexOf("oauth") == -1
					&& request.url.toLowerCase().indexOf("chat") == -1) {
						console.error(
							"Error serving " + request.url + " - " + err.message
						);
					}
					fileServer.serveFile(
						'/index.html', 200, {}, request, response
					);
				}
			});
		}
	}).resume();
}).listen(3018);


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
	try {
		body = JSON.parse(body);
	}catch(error) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:"Invalid body data", success:false}));
	}
	const access_token = body.access_token;
	let userInfo = {};

	//Check access token validity
	const headers = { "Authorization":"Bearer "+access_token };
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

	//avoid saving private data to server
	delete body.data.obsPass;
	delete body.data.oAuthToken;

	//Test data format
	if(schemaValidator(body.data)) {
		fs.writeFileSync(userDataFolder+userInfo.user_id+".json", JSON.stringify(body.data), "utf8");
		response.writeHead(200, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({success:true}));
	}else{
		const message = schemaValidator.errors;
		console.log(message);
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message, success:false}));
	}
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
 * Generates a credential token.
 * 
 * @param client_id 
 * @param client_secret 
 * @param scope 
 * @returns 
 */
async function getClientCredentialToken() {
	//Invalidate token if expiration date is passed
	if(Date.now() > credentialToken_invalidation_date) credentialToken = null;
	//Avoid generating a new token if one already exists
	if(credentialToken) return Promise.resolve(credentialToken);

	//Generate a new token
	let headers = {};
	var options = {
		method: "POST",
		headers: headers,
	};
	let url = "https://id.twitch.tv/oauth2/token?";
	url += "client_id="+credentials.client_id;
	url += "&client_secret="+credentials.client_secret;
	url += "&grant_type=client_credentials";
	url += "&scope="+credentials.scopes.join("+");

	try {
		const result = await fetch(url, options);
		if(result.status == 200) {
			let json = await result.json();
			credentialToken = json.access_token;
			credentialToken_invalidation_date = Date.now() + json.expires_in - 1000;
			return json.access_token;
		}else{
			console.error("Token generation failed");
			console.log(await result.text());
			return null;
		}
	}catch(error) {
		return null;
	}
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
		devmode: {type:"boolean"},
		greetAutoDeleteAfter: {type:"integer", minimum:-1, maximum:3600},
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
		obsConf_sources: {
			type:["object"],
			additionalProperties: true,
			patternProperties: {
				".*": {
					anyOf:[
						{
							type:"array",
							items:[
								{
									type: "object",
									additionalProperties: false,
									properties: {
										id: {type:"string", maxLength:100},
										sourceName: {type:"string", maxLength:100},
										show: {type:"boolean"},
										delay: {type:"number", minimum:0, maximum:999999999},
										filterName: {type:"string", maxLength:100},
										text: {type:"string", maxLength:500},
										url: {type:"string", maxLength:1000},
										mediaPath: {type:"string", maxLength:1000},
									}
								}
							]
						},
						{
							type: "object",
							additionalProperties: false,
							properties: {
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
											}
										},
									]
								}
							}
						}
					]
				},
			}
		},
		v: {type:"integer"},
		obsIP: {type:"string"},
		obsPort: {type:"integer"},
		raffle_postOnChat: {type:"boolean"},
		"p:blockedCommands": {type:"string"},
		"p:bttvEmotes": {type:"boolean"},
		"p:censorDeletedMessages": {type:"boolean"},
		"p:censoreDeletedMessages": {type:"boolean"},
		"p:conversationsEnabled": {type:"boolean"},
		"p:defaultSize": {type:"integer", minimum:0, maximum:5},
		"p:displayTime": {type:"boolean"},
		"p:firstMessage": {type:"boolean"},
		"p:firstTimeMessage": {type:"boolean"},
		"p:groupIdenticalMessage": {type:"boolean"},
		"p:hideChat": {type:"boolean"},
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
		"p:shoutoutLabel": {type:"string"},
		"p:showBadges": {type:"boolean"},
		"p:showBots": {type:"boolean"},
		"p:showCheers": {type:"boolean"},
		"p:showEmotes": {type:"boolean"},
		"p:showFollow": {type:"boolean"},
		"p:showHypeTrain": {type:"boolean"},
		"p:showModTools": {type:"boolean"},
		"p:showPollPredResults": {type:"boolean"},
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
	}
}

const ajv = new Ajv({strictTuples: false })
const schemaValidator = ajv.compile( UserDataSchema );