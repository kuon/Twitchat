import Fastify, { FastifyInstance } from 'fastify';
import Config from "./utils/Config";
import Logger from './utils/Logger';
import * as path from "path";
import * as fs from "fs";
import AuthController from './controllers/AuthController';
import DonorController from './controllers/DonorController';
import UserController from './controllers/UserController';
import SpotifyController from './controllers/SpotifyController';
import BetaController from './controllers/BetaController';
const mime = require('mime-types');

const server: FastifyInstance = Fastify({logger: false});

server.register(require('@fastify/rate-limit'), {
	max: 10,
	ban: 2,
	addHeaders:{
		'x-ratelimit-limit': false,
		'x-ratelimit-remaining': false,
		'x-ratelimit-reset': true,
		'retry-after': false
	},
	timeWindow: '30000',
	allowList: (request, key) => {
		if(!/\/api\//.test(request.url)){
			return true;
		}
		return false;
	}
});

server.register(require('@fastify/cors'), { 
	origin:[/localhost/i, /twitchat\.fr/i],
	methods:['GET', 'PUT', 'POST', 'DELETE'],
	decorateReply: true,
	exposedHeaders:["x-ratelimit-reset"]
})

server.register(require('@fastify/static'), {
	root: Config.PUBLIC_ROOT,
	prefix: '/',
	// setHeaders:(res, path)=>{
	// 	console.log("SET HEADER:", path);
	// 	res.setHeader("Set-Cookie", "cross-site-cookie=*; SameSite=None; Secure");
	// }
})

//Defautl API route
server.get('/api', async (request, response) => {
	return { success: true };
});

//Get latest script.js file for cache bypass
server.get('/api/script', async (request, response) => {
	Logger.info("Serving script for cache bypass")
	const assets = path.join(Config.PUBLIC_ROOT, "assets");
	const file = fs.readdirSync(assets).find(v => /index\..*\.js/gi.test(v));
	const txt = fs.readFileSync(path.join(assets, file), {encoding:"utf8"});
	response.header('Content-Type', 'application/javascript');
	response.status(200);
	response.send(txt);
});

//Get latest script.js file for cache bypass
server.get('/api/configs', async (request, response) => {
	response.header('Content-Type', 'application/javascript');
	response.status(200);
	response.send(JSON.stringify({
		twitch_client_id:Config.credentials.twitch_client_id,
		twitch_scopes:Config.credentials.twitch_scopes,

		spotify_scopes:Config.credentials.spotify_scopes,
		spotify_client_id:Config.credentials.spotify_client_id,
		
		deezer_scopes:Config.credentials.deezer_scopes,
		deezer_client_id:Config.credentials.deezer_client_id,
		deezer_dev_client_id:Config.credentials.deezer_dev_client_id,
	}));
});


server.setNotFoundHandler({
	preValidation: (request, reply, done) => {
		done();
	},
	preHandler: (req, reply, done) => {
		done()
	}
	
}, (request, reply) => {
	if(/^\/api/gi.test(request.url)) {
		console.log("404 !", request.url);
		reply.code(404).send({success:false, error:"Not found"});
	}

	let file = path.join(Config.PUBLIC_ROOT, request.url);
	//No file exists at specified path, send index file
	if(!fs.existsSync(file)) {
		file = path.join(Config.PUBLIC_ROOT, "index.html");
	}
	const stream = fs.createReadStream(file, 'utf8' );

	const mimetype = mime.lookup(file);
	if(mimetype == "text/html") {
		reply.header('Content-Type', mimetype+"; charset=utf-8");
	}else{
		reply.header('Content-Type', mimetype);
	}

	reply.send(stream);
});

// Run the server!
const start = async () => {
	try {
		await server.listen({port:Config.credentials.server_port, host:'0.0.0.0'});
	} catch (err) {
		Logger.error("Server init error");
		console.log(err);
		process.exit(1)
	}
	

	Logger.success("=========================");
	Logger.success("Server ready on port "+Config.credentials.server_port);
	Logger.success("=========================");
}

fs.mkdirSync(Config.USER_DATA_PATH, { recursive: true });
fs.mkdirSync(Config.betaDataFolder, { recursive: true });
fs.mkdirSync(Config.donorsDataFolder, { recursive: true });

//Create controllers
new AuthController(server).initialize();
new DonorController(server).initialize();
new UserController(server).initialize();
new SpotifyController(server).initialize();
new BetaController(server).initialize();

//Start server
start();