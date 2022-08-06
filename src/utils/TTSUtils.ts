import type { PermissionsData } from "@/types/TwitchatDataTypes";
import IRCClient from "./IRCClient";
import IRCEvent from "./IRCEvent";
import { getType, type IRCEventData, type IRCEventDataList } from "./IRCEventDataTypes";
import type { PubSubDataTypes } from "./PubSubDataTypes";
import type PubSubEvent from "./PubSubEvent";
import StoreProxy from "./StoreProxy";
import TwitchUtils from "./TwitchUtils";
import Utils from "./Utils";

export interface SpokenMessage {
	wroteTime: number,
	voiceMessage: SpeechSynthesisUtterance,
	messageID: string|undefined
}

export default class TTSUtils {

	private static _instance:TTSUtils;

	private enabled:boolean = false;
	private voices:SpeechSynthesisVoice[] = window.speechSynthesis.getVoices();

	private pendingMessages:SpokenMessage[] = [];
	private lastMessageTime:number = performance.now();
	private giftedSubs:any = {}

	/********************
	* HANDLERS          *
	********************/
	private addMessageHandler!:(e:IRCEvent)=>void;
	private deleteMessageHandler!:(e:IRCEvent)=>void;
	
	constructor() {
		window.speechSynthesis.onvoiceschanged = () => { // in case they are not yet loaded
			this.voices = window.speechSynthesis.getVoices();
			// StoreProxy.store.state.ttsParams.voice.listValues = this.voices.map(x => { return {label:x.name, value:x.name} });
		};
		this.addMessageHandler = (e:IRCEvent)=> this.onAddMessage(e);
		this.deleteMessageHandler = (e:IRCEvent)=> this.onDeleteMessage(e);
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():TTSUtils {
		if(!TTSUtils._instance) {
			TTSUtils._instance = new TTSUtils();
		}

		return TTSUtils._instance;
	}
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Enables TTS
	 */
	 public async enable(enable: boolean):Promise<void> {
		 if (enable && !this.enabled) {
			 IRCClient.instance.addEventListener(IRCEvent.DELETE_MESSAGE, this.deleteMessageHandler);
			 IRCClient.instance.addEventListener(IRCEvent.MESSAGE, this.addMessageHandler);
			 IRCClient.instance.addEventListener(IRCEvent.NOTICE, this.addMessageHandler);
			 IRCClient.instance.addEventListener(IRCEvent.HIGHLIGHT, this.addMessageHandler);
		} else if (!enable && this.enabled) {
			IRCClient.instance.removeEventListener(IRCEvent.DELETE_MESSAGE, this.deleteMessageHandler);
			IRCClient.instance.removeEventListener(IRCEvent.MESSAGE, this.addMessageHandler);
			IRCClient.instance.removeEventListener(IRCEvent.NOTICE, this.addMessageHandler);
			IRCClient.instance.removeEventListener(IRCEvent.HIGHLIGHT, this.addMessageHandler);
		}
		this.enabled = enable;
	}

    /**
     * Get voices list
     * 
     * @returns SpeechSynthesisVoice[]
     */
    public getVoices():SpeechSynthesisVoice[] {
		return this.voices;
    }

	public speak(message: IRCEventDataList.Message) {
		this.processMessage(message);
	}

	private onAddMessage(e:IRCEvent):void {
		const message = e.data as IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper|IRCEventDataList.Notice|IRCEventDataList.PollResult|IRCEventDataList.PredictionResult;
		this.processMessage(message);
	}

	private replacePattern(pattern: string, messageStr: string, user: string|undefined): string {
		messageStr = pattern.replace('$MESSAGE', messageStr);
		messageStr = messageStr.replace('$USER', user ? user : '');
		return messageStr;
	}

	private processMessage(message:IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper|IRCEventDataList.Notice|IRCEventDataList.PollResult|IRCEventDataList.PredictionResult) {
		const paramsTTS = StoreProxy.store.state.ttsParams;
		// const uid:string|undefined = message?.tags['user-id'];
		let user: string|undefined;
		let messageStr: string = message.type === "whisper"? message.params[1] : message.message as string;
		
		if (message.type === 'message') {
			// only speak if inactivity period is reached
			const lastMessageTime = this.lastMessageTime;
			this.lastMessageTime = performance.now();
			user = message?.tags['display-name'];
			if (paramsTTS.inactivityPeriod > 0 && (performance.now() - lastMessageTime <= paramsTTS.inactivityPeriod * 1000 * 60)) {
				return;
			}
			if (paramsTTS['speakPattern'+message.type] === '') {
				return;
			}
			if(message.message && message.tags.username) {
				if(!Utils.checkPermissions(paramsTTS.ttsPerms, message.tags)) {
					return;
				}
			}
			messageStr = this.replacePattern(paramsTTS['speakPattern'+message.type], messageStr, user);
		} else if (message.type === 'whisper') {
			if (paramsTTS['speakPattern'+message.type] === '') {
				return;
			}
			user = message?.tags['display-name'];
			messageStr = this.replacePattern(paramsTTS['speakPattern'+message.type], messageStr, user);
		} else if (message.type === 'notice') {
			if (paramsTTS['speakPattern'+message.type] === '') {
				return;
			}			
		} else if (message.type === 'poll') {
			if(!paramsTTS.speakPolls) return;
			const pollData:IRCEventDataList.PollResult = message as IRCEventDataList.PollResult;
			const winner = pollData.data.choices.reduce((prev, elem) => {
				if (elem.channel_points_votes > prev.channel_points_votes) {
					return elem;
				} else {
					return prev;
				}});
			
			messageStr = "Poll result, winner is "+winner.title;
		} else if (message.type === 'prediction') {
			if(!paramsTTS.speakPredictions) return;
			const predictionData:IRCEventDataList.PredictionResult = message as IRCEventDataList.PredictionResult;			
			const winner = predictionData.data.outcomes.find(pred => pred.id === predictionData.data.winning_outcome_id);
			if (winner) {
				messageStr = "Prediction result, correct answer is "+winner.title;
			}
	 	} else {
			let type:"bits"|"sub"|"raid"|"reward"|"follow"|"poll"|"prediction"|"commercial"|"bingo"|"raffle"|"countdown"|"cooldown"|null = getType(message);
			messageStr = message.tags['system-msg']
			
			if(type == "sub") {
				if (!paramsTTS.speakSubs) return;
				
				if(message.methods?.prime) {
					messageStr = ""+message.username+" subscribed with Prime";
				} else if (message.recipient) { // subgift
					const value = parseInt(message.methods?.plan!)/1000;
					if (message.username && !(message.username in this.giftedSubs)) {
						this.giftedSubs[message.username] = 1;
						setTimeout(() => {
							if(this.giftedSubs[message.username!] > 1) {
								messageStr = ""+message.username+" gifted "+(this.giftedSubs[message.username!])+" Tier "+value;
							} else {
								messageStr = ""+message.username+" gifted a Tier "+value+" to "+message.recipient;
							}
							delete this.giftedSubs[message.username!];
							this.speakText(messageStr, message.tags.id);
						}, 5000);
					} else if (message.username) {						
						this.giftedSubs[message.username]++;
					} else {
						// nothing
					}
					return;
				} else if (message.tags['message-type'] == "giftpaidupgrade") {
					messageStr = ""+message.username+" is continuing the Gift Sub they got from "+message.sender;
				} else { // sub
					const value = parseInt(message.methods?.plan!)/1000;
					messageStr = ""+message.username+" subscribed at Tier "+value;
				}
			}
			else if(type == "reward") {
				if(!paramsTTS.speakRewards) return;
				const localObj = message.reward as PubSubDataTypes.RewardData;				
				messageStr = localObj.redemption.user.display_name+" redeemed the reward "+localObj.redemption.reward.title;
			}
			else if(type == "raid") {
				if (!paramsTTS.speakRaids) return;
				messageStr = ""+message.username+" is raiding with a party of "+message.viewers+".";
			}
			else if(type == "bits") {
				if(!paramsTTS.speakBits) return;
				messageStr = ""+message.tags.username+" sent "+message.tags.bits+" bits";
			}
			else if(type == "follow") {
				if(!paramsTTS.speakFollow) return;
				messageStr = ""+message.username+" followed your channel!";
			}
			else if(type == "bingo") {
				if(!paramsTTS.speakBingos) return;
				messageStr = "";
			}
			else if(type == "raffle"){
				if(!paramsTTS.speakRaffles) return;
				messageStr = "";
			}
			else if(type == "commercial") return;
			else if(type == "countdown") return;
		}
		
		if (messageStr) {
			if (paramsTTS.removeURL) {
				messageStr = messageStr.replace(/(http[s]?|ftp):[^ ]*/g, paramsTTS.replaceURL);
			}	
	
			messageStr = messageStr.substring(0, paramsTTS.maxLength || Number.MAX_VALUE);
			if (paramsTTS.removeEmotes) {
				messageStr = TwitchUtils.parseEmotes(messageStr, undefined, true, true).map(elem=>elem.value).join(' ');
			}	
			this.speakText(messageStr, message.tags.id);
		}	
	}	

	private async speakText(messageStr: string, messageID:string|undefined):Promise<void> {
		if (!this.enabled) {
			return;
		}			
		const paramsTTS = StoreProxy.store.state.ttsParams;
		
		const mess = new SpeechSynthesisUtterance(messageStr);
		mess.rate = paramsTTS.rate;
		mess.pitch = paramsTTS.pitch;
		mess.volume = paramsTTS.volume;
		mess.voice = this.voices.find(x => x.name == paramsTTS.voice) || this.voices[0];
		mess.lang = mess.voice.lang;
		mess.onend = (ev: SpeechSynthesisEvent) => {
			let nextMessage = this.pendingMessages.shift();
			if (nextMessage) {
				// check timeout
				if (paramsTTS.timeout === 0 || performance.now() - nextMessage.wroteTime <= paramsTTS.timeout * 1000) {
					window.speechSynthesis.speak(nextMessage.voiceMessage);
				}			
			}			
		}			
		
		if (!window.speechSynthesis.speaking) {
			window.speechSynthesis.speak(mess);
		} else {
			this.pendingMessages.push({wroteTime: performance.now(), voiceMessage: mess, messageID: messageID});
		}			
	}			

	private onDeleteMessage(e:IRCEvent|PubSubEvent):void {
		let messageID = "";
		if(typeof e.data == "string") {
			messageID = e.data;
		}else{
			const data = e.data as IRCEventDataList.MessageDeleted;
			messageID = data.tags['target-msg-id'] as string;
		}

		let index = this.pendingMessages.findIndex(v => v.messageID === messageID);
		if(index > -1) {
			this.pendingMessages.splice(index, 1);
		}
	}

}
