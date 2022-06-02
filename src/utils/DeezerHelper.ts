import store from "@/store";
import { reactive } from "vue";
import Config from "./Config";
import PublicAPI from "./PublicAPI";
import { MusicMessage } from "./TriggerActionHandler";
import TwitchatEvent from "./TwitchatEvent";

/**
* Created : 23/05/2022 
*/
export default class DeezerHelper {
	
	public currentTrack:MusicMessage|null = null;
	public userInteracted:boolean = true;

	private static _instance:DeezerHelper;
	private _playerHolder!:HTMLDivElement;
	private _searchPromise!:(value: DeezerTrack | PromiseLike<DeezerTrack>) => void;
	private _createPromiseSuccess!:() => void;
	private _createPromiseError!:() => void;
	private _idToTrack:{[key:string]:MusicMessage} = {};
	private _forcePlay:boolean = true;
	private _scriptElement!:HTMLScriptElement;
	private _initCheckInterval!:number;
	private _sessionIndex:number = 0;
	private _playbackPos:number = 0;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():DeezerHelper {
		if(!DeezerHelper._instance) {
			DeezerHelper._instance = reactive(new DeezerHelper()) as DeezerHelper;
			DeezerHelper._instance.initialize();
		}
		return DeezerHelper._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public createPlayer():Promise<void> {
		return new Promise((resolve, reject)=> {
			this._createPromiseSuccess = resolve;
			this._createPromiseError = reject;
			const index = ++this._sessionIndex;
			//@ts-ignore
			if(window.dzAsyncInit) return;
			//@ts-ignore
			window.dzAsyncInit = () => {
				console.log("DZ ASYNC INIT");
				DZ.init({
					appId  : Config.DEEZER_CLIENT_ID,
					channelUrl : document.location.origin+'/deezer.html',
					player : {
						onload: () => {
							console.log("ON LOAD", index, this._sessionIndex);
							if(index != this._sessionIndex)	{
								console.log("Stop init", index, this._sessionIndex);
								return;
							}
							console.log("ON LOAD > start auth");
							this.startAuthFlow();
						}
					}
				});
				let readyFlag = false;
				DZ.ready((sdk_options) => {
					readyFlag = true;
					console.log('DZ SDK is ready', sdk_options);
				});
				//Because deezer player is dick coded it "sometimes" fails to initialize
				//This interval is here to refresh the iframe until the ready event is
				//properly fired.
				clearInterval(this._initCheckInterval);
				this._initCheckInterval = setInterval(()=> {
					if(!readyFlag) {
						console.log("DZ SDK failed to initialize, try again");
						const iframe:HTMLIFrameElement = this._playerHolder.getElementsByTagName("iframe")[0];
						iframe.src += "&1";
					}else{
						clearInterval(this._initCheckInterval);
					}
				}, 5000);
			};
	
			this._scriptElement = document.createElement('script');
			this._scriptElement.src = 'https://e-cdn-files.dzcdn.net/js/min/dz.js';
			this._scriptElement.async = true;
			this._playerHolder = document.createElement("div");
			this._playerHolder.setAttribute("id", "dz-root");
			document.body.appendChild( this._playerHolder );
			this._playerHolder.appendChild(this._scriptElement);
			this._playerHolder.classList.add("hide");
			//@ts-ignore
			window.onDeezerSearchResult = (data:unknown) => this.onSearchResult(data);
		})
	}

	/**
	 * Disposes the deezer player
	 */
	public dispose():void {
		clearInterval(this._initCheckInterval);
		console.log("DISPOSE");
		this._forcePlay = true;
		this._playbackPos = 0;
		this.currentTrack = null;
		this._scriptElement.remove();
		//@ts-ignore
		//esling-disable-next-line
		this._playerHolder.replaceChildren();
		this._playerHolder.parentNode?.removeChild(this._playerHolder);
		//@ts-ignore
		//esling-disable-next-line
		delete window.dzAsyncInit;
		//@ts-ignore
		delete window.DZ;
	}

	/**
	 * Starts the aut flow
	 */
	public async startAuthFlow():Promise<void> {
		console.log("START AUTH FLOW");
		// let url = "https://connect.deezer.com/oauth/auth.php";
		// url += "?app_id="+Config.DEEZER_CLIENT_ID;
		// url += "&redirect_uri="+encodeURIComponent( document.location.origin+"/deezer/auth" );
		// url += "&perms="+Config.DEEZER_SCOPES;

		// document.location.href = url;
		DZ.login((res)=> {
			console.log(res);
			if (res.status == "connected") {
				if(store.state.deezerConnected)
				console.log("AUTH COMPLETE");
				console.log(res.status);
				this.userInteracted = false;
				this._playerHolder.classList.remove("hide");
				console.log("ONLOAD PLAYER");
				const onFocus = () => {
					console.log("##on focus");
					window.focus();
				};
				window.addEventListener("mouseenter", onFocus);
				
				const onBlur = () => {
					console.log("##on blur");
					setTimeout(() => {
						if(!document.activeElement) return;
						if (document.activeElement.tagName === "IFRAME") {
							this.userInteracted = true;
							console.log("CLICK");
							this._playerHolder.classList.add("hide");
							window.removeEventListener("blur", onBlur);
							window.removeEventListener("mouseenter", onFocus);
						}
					}, 0);
				};
				window.addEventListener("blur", onBlur);

				DZ.Event.subscribe('current_track', (arg) => {
					console.log("CURRENT TRACK", arg);
					const track = this._idToTrack[arg.track.id];
					if(track) {
						if(track != this.currentTrack || this._forcePlay) {
							if(DZ.player.isPlaying() !== true) {
								this._forcePlay = false;
								console.log("Force play");
								DZ.player.play();
							}
						}
						this.currentTrack = track;
					}
					this.publishTrackEvent();
				});

				DZ.Event.subscribe('tracklist_changed', () => {
					console.log("TRACK LIST CHANGED");
					if(DZ.player.isPlaying() !== true) {
						this._forcePlay = true;
						console.log("Force play 2");
						// DZ.player.play();
					}
				});

				DZ.Event.subscribe('player_position', (arg) => {
					// event_listener_append('position', arg[0], arg[1]);
					this._playbackPos = arg[0];
				});
				
				store.dispatch("setDeezerConnected", true);
				this._createPromiseSuccess();
			}else{
				store.state.alert = "Deezer authentication failed";
				store.dispatch("setDeezerConnected", false);
				this._createPromiseError();
			}
		}, {perms: Config.DEEZER_SCOPES});
	}

	/**
	 * Authenticate the user after receiving the auth_code once
	 * oauth flow completes.
	 * 
	 * @param authCode 
	 */
	public async authenticate(authCode:string):Promise<void> {
		let json:DeezerAuthToken = {} as DeezerAuthToken;
		const res = await fetch(Config.API_PATH+"/deezer/auth?code="+authCode+"&isProd="+(Config.IS_PROD?"1":"0"), {method:"GET"});
		json = await res.json();
		if(json.access_token) {
			store.dispatch("setDeezerToken", json);
		}else{
			throw(json);
		}
	}

	/**
	 * Adds a track to the queue
	 * 
	 * @returns if a track has been found or not
	 */
	public async searchTrack(search:string):Promise<DeezerTrack> {
		return new Promise((resolve)=> {
			const e = document.createElement('script');
			e.src = 'https://api.deezer.com/search?q=' + search + '&output=jsonp&callback=onDeezerSearchResult';
			e.async = true;
			e.onload = ()=> {
				//Cleanup DOM
				setTimeout(()=> {
					document.body.removeChild(e);
				}, 1000)
			}
			document.body.appendChild(e);
			this._searchPromise = resolve;
		});
	}

	public playTrack(track:DeezerTrack):void {
		DZ.player.playTracks([track.id]);
	}
	
	/**
	 * Adds a track to the queue
	 * 
	 * @param uri Deezer URI of the track to add. Get one with "searchTrack()" method
	 */
	public addToQueue(track:DeezerTrack):void {
		this._forcePlay = true;
		if(!this.currentTrack) this.currentTrack = this._idToTrack[track.id];
		console.log("ADD TO QUEUE", track);
		DZ.player.addToQueue([track.id]);
	}

	/**
	 * Plays next track in queue
	 * @returns 
	 */
	public nextTrack():void {
		DZ.player.next();
	}

	/**
	 * Plays previous track
	 * @returns 
	 */
	public prevTrack():void {
		DZ.player.prev();
	}

	/**
	 * Pause the playback
	 * @returns 
	 */
	public pause():void {
		DZ.player.pause();
	}

	/**
	 * Resume/starts the playback
	 * @returns 
	 */
	public resume():void {
		DZ.player.play();
	}

	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_TRACK, ()=>{
			this.publishTrackEvent();
		});
	}

	private publishTrackEvent():void {
		if(this.currentTrack) {
			//Broadcast to the overlays
			PublicAPI.instance.broadcast(TwitchatEvent.CURRENT_TRACK, {
				trackName: this.currentTrack.title,
				artistName: this.currentTrack.artist,
				trackDuration: this.currentTrack.duration * 1000,
				trackPlaybackPos: this._playbackPos * 1000,
				cover: this.currentTrack.cover,
			});
		}
	}

	private onSearchResult(json:{data:DeezerTrack[], next:string, total:number}):void {
		console.log("ON SEARCH RESULT");
		console.log(json);
		if (json.data && json.data.length > 0) {
			const track = json.data[0];
			const music:MusicMessage =  {
				type:"music",
				title:track.title,
				artist:track.artist.name,
				album:track.album.title,
				cover:track.album.cover_medium,
				duration:track.duration,
				url:track.link,
			};
			this._idToTrack[track.id] = music;
			this._searchPromise( track );
		}
	}

}

export interface DeezerAuthResult {
	code:string;
}

export interface DeezerAuthToken {
	access_token:string;
	token_type:string;//Bearer
	scope:string;
	expires_at:number;//In seconds
	expires_in:number;//In seconds
	refresh_token:string;
}

export interface DeezerTrack {
	id: number;
	readable: boolean;
	title: string;
	title_short: string;
	link: string;
	duration: number;
	rank: number;
	explicit_lyrics: boolean;
	explicit_content_lyrics: number;
	explicit_content_cover: number;
	preview: string;
	md5_image: string;
	artist: Artist;
	album: Album;
	type: string;
}

export interface Artist {
	id: number;
	name: string;
	link: string;
	picture: string;
	picture_small: string;
	picture_medium: string;
	picture_big: string;
	picture_xl: string;
	tracklist: string;
	type: string;
}

export interface Album {
	id: number;
	title: string;
	cover: string;
	cover_small: string;
	cover_medium: string;
	cover_big: string;
	cover_xl: string;
	md5_image: string;
	tracklist: string;
	type: string;
}


declare namespace DZ {

	interface SubscribeFunc {
		(event:'current_track', callback:(arg:{
			index:number;
			track:{
				id:string;
				title:number;
				duration:number;
				album:{
					id:string;
					title:string;
				};
				artist:{
					id:string;
					name:string;
				};
			}
		})=>void): void;
		(event:'tracklist_changed', callback:()=>void): void;
		(event:'player_position', callback:(arg:[pos:number, duration:number])=>void): void;
	}

	const player:{
		playTracks:(id:number[])=>void;
		addToQueue:(id:number[])=>void;
		next:()=>void;
		prev:()=>void;
		play:()=>void;
		pause:()=>void;
		isPlaying():boolean;
	};

	const Event:{
		subscribe:SubscribeFunc;
	}

	function login(arg:(res:{
		authResponse?:{
			accessToken:string;
			expire:number;
		};
		userID:string;
		status:"connected";
		authInitDate:number;
	})=>void, options:{perms:string}):void
	
	function logout():void

	function init(args:
		{
			appId: string;
			channelUrl: string;
			player?: {
				container?: string;
				width?: number;
				height?: number;
				layout?: string;
				onload?: (args:{
					volume:number;
					suffle:number;
					repeat:number;
					muted:number;
				})=>void;
			}
		}
	):void;

	function ready(callback:(sdk_options:
		{
			player:{
				volume:number;
				suffle:number;
				repeat:number;
				muted:number;
			};
			token:{
				accessToken:string;
				expire:number;
			}
		}
	)=>void):void;
}