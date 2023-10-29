import rewardImg from '@/assets/icons/reward_highlight.svg';
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { reactive } from "vue";

/**
 * Created by Durss
 */
export default class Config {

	private static _instance:Config;

	/**
	 * Twitch released a broken API.
	 * This flag allows to disable everything related to this until they fix it
	 */
	public AD_API_AVAILABLE = false;

	/**
	 * Port for the twitchat's server services
	 */
	public SERVER_PORT = 3018;
	/**
	 * Is Twitchat running on a production server ?
	 */
	public IS_PROD:boolean = document.location.hostname != "localhost" && document.location.hostname != "192.168.1.10";
	/**
	 * Heat extension URL
	 */
	public HEAT_EXTENSION = "https://dashboard.twitch.tv/extensions/cr20njfkgll4okyrhag7xxph270sqk";
	/**
	 * Twitchat API path
	 */
	public TWITCH_API_PATH = "https://api.twitch.tv/helix/";
	/**
	 * Eventsub URL
	 */
	public TWITCH_EVENTSUB_PATH = "wss://eventsub.wss.twitch.tv/ws";
	// public TWITCH_API_PATH = "http://localhost:8000/mock/";
	// public TWITCH_EVENTSUB_PATH = "ws://localhost:8001/eventsub";
	/**
	 * Donation amount to get lifetime Twitchat subscription
	 */
	public LIFETIME_DONOR_VALUE = 89;
	/**
	 * Get if twitchat is running on an OBS dock
	 */
	public OBS_DOCK_CONTEXT:boolean = window.obsstudio != undefined;
	/**
	 * URL of twitchat's discord
	 */
	public DISCORD_URL = "https://discord.gg/fmqD2xUYvP";
	/**
	 * URL of twitchat's youtube
	 */
	public YOUTUBE_URL = "https://www.youtube.com/@Twitchat/videos";
	/**
	 * If set to true, replaces mouse cursor with a huge fake one
	 */
	public DEMO_MODE = false;
	/**
	 * Maximum entries per prediction
	 */
	public MAX_PREDICTION_OUTCOMES = 10;
	/**
	 * No twitchat ad for users with less than this amount of followers
	 */
	public AD_MIN_FOLLOWERS_COUNT = 50;
	/**
	 * Time to wait between to SO
	 */
	public TWITCH_SHOUTOUT_COOLDOWN = 2 * 60 * 1000;
	/**
	 * Time to wait between to SO for the same user
	 */
	public TWITCH_SHOUTOUT_COOLDOWN_SAME_USER = 60 * 60 * 1000;
	/**
	 * Maximum custom user names we can create without being premium
	 */
	public MAX_CUSTOM_USERNAMES = 10;
	/**
	 * Maximum custom user names we can create when premium
	 */
	public MAX_CUSTOM_USERNAMES_PREMIUM = 10000;
	/**
	 * Maximum custom user badges we can create without being premium
	 */
	public MAX_CUSTOM_BADGES = 3;
	/**
	 * Maximum custom user badges we can create without when premium
	 */
	public MAX_CUSTOM_BADGES_PREMIUM = 100;
	/**
	 * Maximum user we can give custom badges without being premium
	 */
	public MAX_CUSTOM_BADGES_ATTRIBUTION = 30;
	/**
	 * Maximum user we can give custom badges when premium
	 */
	public MAX_CUSTOM_BADGES_ATTRIBUTION_PREMIUM = 10000;
	/**
	 * Maximum heat screens we can create without being premium
	 */
	public MAX_CUSTOM_HEAT_SCREENS = 2;
	/**
	 * Maximum heat screens we can create when premium
	 */
	public MAX_CUSTOM_HEAT_SCREENS_PREMIUM = 100;
	/**
	 * Maximum duration in ms during which an orange circle remains visible while not cicked
	 */
	public NEW_FLAG_DURATION = 30 * 24 * 60 * 60000;
	/**
	 * Maxium number of chat columns that can be created
	 */
	public MAX_CHAT_COLUMNS = 7;
	/**
	 * Maxium number of values that can be created without being premium
	 */
	public MAX_VALUES = 3;
	/**
	 * Maxium number of values that can be created when premium
	 */
	public MAX_VALUES_PREMIUM = 10000;
	/**
	 * Maxium number of triggers that can be created without being premium
	 */
	public MAX_TRIGGERS = 40;
	/**
	 * Maxium number of triggers that can be created when premium
	 */
	public MAX_TRIGGERS_PREMIUM = 1000;//TODO limit triggers count for premium. Unlimitted for now
	/**
	 * Maxium number of triggers that can be created without being premium
	 */
	public MAX_COUNTERS = 20;
	/**
	 * Maxium number of triggers that can be created when premium
	 */
	public MAX_COUNTERS_PREMIUM = 10000;//TODO limit counters count for premium. Unlimitted for now
	/**
	 * Maxium number of distortion overlays
	 */
	public MAX_DISTORTION_OVERLAYS = 1;
	/**
	 * Maxium number of distortion overlays for premium
	 */
	public MAX_DISTORTION_OVERLAYS_PREMIUM = 20;
	
	private _serverConfig!:ServerConfig;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():Config {
		if(!Config._instance) {
			Config._instance = reactive(new Config()) as Config;
		}
		return Config._instance;
	}

	/**
	 * Add twitch logins to connect to their chats and get some
	 * PubSub events from
	 */
	public get debugChans():{platform:TwitchatDataTypes.ChatPlatform, login:string}[] {
		if(this.IS_PROD) return [];
		return [
			// {platform:"twitch", login:"mewstelle"},
		];
	}

	/**
	 * Path to twitchat's API
	 */
	public get API_PATH():string {
		if(!this.IS_PROD) {
			return document.location.protocol+"//"+document.location.hostname+":"+this.SERVER_PORT+"/api";
		}else{
			return document.location.protocol+"//"+document.location.hostname+"/api";
		}
	}

	/**
	 * Get if current twitchat instance is a beta instance
	 */
	public get BETA_MODE():boolean {
		// if(!this.IS_PROD) {
		// 	return true;//Simulate beta env on local
		// }
		return document.location.host.indexOf("beta") > -1 || document.location.host.indexOf("localhost") > -1;
	}

	/**
	 * Twitch client ID of Twitchat app
	 */
	public get TWITCH_CLIENT_ID():string { return this._serverConfig.twitch_client_id; }
	/**
	 * List of twitch scopes Twitchat can request
	 */
	public get TWITCH_APP_SCOPES():string[] { return this._serverConfig.twitch_scopes; }
	/**
	 * Not used since Spotify refused Twitchat extended quotas...
	 */
	public get SPOTIFY_CLIENT_ID():string { return this._serverConfig.spotify_client_id; }
	/**
	 * Scopes required for spotify auth
	 */
	public get SPOTIFY_SCOPES():string { return this._serverConfig.spotify_scopes; }
	/**
	 * Patreon app client ID
	 */
	public get PATREON_CLIENT_ID():string { return this._serverConfig.patreon_client_id; }
	/**
	 * Patreon app requested scopes
	*/
	public get PATREON_SCOPES():string { return this._serverConfig.patreon_scopes; }
	/**
	 * Paypal app client ID
	 */
	public get PAYPAL_CLIENT_ID():string { return this._serverConfig.paypal_client_id; }
	/**
	 * Contact mail
	 */
	public get CONTACT_MAIL():string { return this._serverConfig.contact_mail; }

	/**
	 * Fake Twitch "highlight my message" reward
	 */
	public get highlightMyMessageReward():TwitchDataTypes.Reward {
		const img = rewardImg;
		return {
			broadcaster_name: "Durss",
			broadcaster_login: "durss",
			broadcaster_id: "29961813",
			id: "highlighted-message",
			image:{
				url_1x:img,
				url_2x:img,
				url_4x:img,
			},
			background_color: "#9147ff",
			is_enabled: true,
			cost: -1,
			title: "Highlight my message",
			prompt: "",
			is_user_input_required: true,
			max_per_stream_setting: {
				is_enabled: false,
				max_per_stream: 0,
			},
			max_per_user_per_stream_setting: {
				is_enabled: false,
				max_per_user_per_stream: 0,
			},
			global_cooldown_setting: {
				is_enabled: false,
				global_cooldown_seconds: 0,
			},
			is_paused: false,
			is_in_stock: true,
			default_image: {
				url_1x:img,
				url_2x:img,
				url_4x:img,
			},
			should_redemptions_skip_request_queue: false,
		}
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public populateServerConfigs(data:ServerConfig):void {
		this._serverConfig = data;
	}

	public getParamByKey(key:string):unknown {
		return this[key as keyof typeof Config.instance];
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}

export interface ServerConfig {
	twitch_client_id: string;
	twitch_scopes: string[];
	spotify_client_id: string;
	spotify_scopes: string;
	patreon_client_id: string;
	patreon_scopes: string;
	paypal_client_id: string;
	contact_mail: string;
}