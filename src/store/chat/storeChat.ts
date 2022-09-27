import MessengerProxy from '@/messaging/MessengerProxy'
import DataStore from '@/store/DataStore'
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import type { TwitchDataTypes } from '@/types/TwitchDataTypes'
import PublicAPI from '@/utils/PublicAPI'
import TriggerActionHandler from '@/utils/TriggerActionHandler'
import TwitchatEvent from '@/utils/TwitchatEvent'
import TwitchUtils from '@/utils/TwitchUtils'
import UserSession from '@/utils/UserSession'
import Utils from '@/utils/Utils'
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { JsonObject } from 'type-fest'
import type { UnwrapRef } from 'vue'
import StoreProxy, { type IChatActions, type IChatGetters, type IChatState } from '../StoreProxy'

export const storeChat = defineStore('chat', {
	state: () => ({
		searchMessages: "",
		realHistorySize: 5000,
		whispersUnreadCount: 0,
		messages: [],
		pinedMessages: [],
		activityFeed: [],
		emoteSelectorCache: [],
		whispers: {},
		
		botMessages: {
			raffleStart: {
				enabled:true,
				message:"/announce 🎉🎉🎉 Raffle has started 🎉🎉🎉 Use {CMD} command to enter!",
			},
			raffle: {
				enabled:true,
				message:"/announce 🎉🎉🎉 Congrats @{USER} you won the raffle 🎉🎉🎉",
			},
			raffleJoin: {
				enabled:true,
				message:"VoteYea @{USER} you entered the raffle.",
			},
			bingoStart: {
				enabled:true,
				message:"/announce 🎉🎉🎉 Bingo has started 🎉🎉🎉 {GOAL}",
			},
			bingo: {
				enabled:true,
				message:"/announce 🎉🎉🎉 Congrats @{USER} you won the bingo 🎉🎉🎉",
			},
			shoutout: {
				enabled:true,
				message:"/announce Go checkout {USER} {URL} . Their last stream title was \"{TITLE}\" in category \"{CATEGORY}\".",
			},
			twitchatAd: {
				enabled:false,
				message:"/announcepurple Are you a Twitch streamer? I'm using GivePLZ twitchat.fr TakeNRG, a full featured chat alternative for streamers. Take a look at it if you wish KomodoHype",
			},
		},
		commands: [
			{
				id:"updates",
				cmd:"/updates",
				details:"Show latest Twitchat updates",
			},
			{
				id:"tip",
				cmd:"/tip",
				details:"Get a tip about Twitchat",
			},
			{
				id:"timerStart",
				cmd:"/timerStart",
				details:"Start a timer",
			},
			{
				id:"timerStop",
				cmd:"/timerStop",
				details:"Stop the timer",
			},
			{
				id:"countdown",
				cmd:"/countdown {(hh:)(mm:)ss}",
				details:"Start a countdown",
			},
			{
				id:"search",
				cmd:"/search {text}",
				details:"Search for a message by its content",
			},
			{
				id:"userinfo",
				cmd:"/userinfo {user}",
				alias:"/user {user}",
				details:"Opens a user's profile info",
			},
			{
				id:"raffle",
				cmd:"/raffle",
				details:"Start a raffle",
			},
			{
				id:"bingo",
				cmd:"/bingo {number|emote}",
				details:"Create a bingo session",
			},
			{
				id:"raid",
				cmd:"/raid {user}",
				details:"Raid someone",
			},
			{
				id:"so",
				cmd:"/so {user}",
				details:"Shoutout a user",
			},
			{
				id:"poll",
				cmd:"/poll {title}",
				details:"Start a poll",
				needChannelPoints:true,
			},
			{
				id:"chatsugg",
				cmd:"/chatsugg",
				details:"Start a chat suggestion",
			},
			{
				id:"prediction",
				cmd:"/prediction {title}",
				details:"Start a prediction",
				needChannelPoints:true,
			},
			{
				id:"announce",
				cmd:"/announce {message}",
				details:"Makes an announcement",
				needChannelPoints:false,
			},
			{
				id:"announceblue",
				cmd:"/announceblue {message}",
				details:"Makes an announcement",
				needChannelPoints:false,
			},
			{
				id:"announcegreen",
				cmd:"/announcegreen {message}",
				details:"Makes an announcement",
				needChannelPoints:false,
			},
			{
				id:"announceorange",
				cmd:"/announceorange {message}",
				details:"Makes an announcement",
				needChannelPoints:false,
			},
			{
				id:"announcepurple",
				cmd:"/announcepurple {message}",
				details:"Makes an announcement",
				needChannelPoints:false,
			},
			{
				id:"commercial",
				cmd:"/commercial {duration}",
				details:"Starts an ad. Duration: 30, 60, 90, 120, 150 or 180",
				needChannelPoints:false,
			},
			{
				id:"vip",
				cmd:"/vip {user}",
				details:"Give VIP status to a user",
				needChannelPoints:true,
			},
			{
				id:"unvip",
				cmd:"/unvip {user}",
				details:"Remove VIP status from a user",
				needChannelPoints:true,
			},
			{
				id:"to",
				cmd:"/timeout {user} {duration} {reason}",
				details:"Ban a user temporarily",
			},
			{
				id:"unban",
				cmd:"/unban {user}",
				details:"Unban a user",
			},
			{
				id:"tts",
				cmd:"/tts {user}",
				details:"Start reading the messages of a user",
				needTTS:true,
			},
			{
				id:"ttsoff",
				cmd:"/ttsoff {user}",
				details:"Stop reading the messages of a user",
				needTTS:true,
			},
			{
				id:"block",
				cmd:"/block {user}",
				details:"Block a user",
			},
			{
				id:"Unblock",
				cmd:"/unblock {user}",
				details:"Unblock a user",
			}
		],

		spoilerParams: {
			permissions:{
				broadcaster:true,
				mods:true,
				vips:false,
				subs:false,
				all:false,
				users:""
			},
		},

		isChatMessageHighlighted: false,
		chatHighlightOverlayParams: {
			position:"bl",
		},
	} as IChatState),



	getters: {
	} as IChatGetters
	& ThisType<UnwrapRef<IChatState> & _StoreWithGetters<IChatGetters> & PiniaCustomProperties>
	& _GettersTree<IChatState>,



	actions: {

		sendTwitchatAd(adType:TwitchatDataTypes.TwitchatAdStringTypes = -1) {
			if(adType == -1) {
				let possibleAds:TwitchatDataTypes.TwitchatAdStringTypes[] = [];
				if(!UserSession.instance.isDonor || UserSession.instance.donorLevel < 2) {
					possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.SPONSOR);
				}
				//Give more chances to hae anything but the "sponsor" ad
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.DISCORD);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.DISCORD);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.DISCORD);

				const lastUpdateRead = parseInt(DataStore.get(DataStore.UPDATE_INDEX));
				if(isNaN(lastUpdateRead) || lastUpdateRead < StoreProxy.main.latestUpdateIndex) {
					//Force last updates if any not read
					possibleAds = [TwitchatDataTypes.TwitchatAdTypes.UPDATES];
				}else{
					//Add 2 empty slots for every content type available
					//to reduce chances to actually get an "ad"
					const len = 2*possibleAds.length;
					for (let i = 0; i < len; i++) possibleAds.push(-1);
				}
		
				adType = Utils.pickRand(possibleAds);
				// contentID = TwitchatAdTypes.UPDATES;//TODO comment this line
				if(adType == -1) return;
			}

			const list = this.messages.concat();
			list .push( {
				source:"twitch",
				id:crypto.randomUUID(),
				date:Date.now(),
				type:TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD,
				adType,
			} );
			this.messages = list;
		},

		
		async addMessage(message:TwitchatDataTypes.ChatMessageTypes) {
			const sParams = StoreProxy.params;
			const sStream = StoreProxy.stream;
			const sUsers = StoreProxy.users;

			let messages = this.messages.concat();
			
			//Limit history size
			// const maxMessages = sParams.appearance.historySize.value;
			const maxMessages = this.realHistorySize;
			if(messages.length >= maxMessages) {
				messages = messages.slice(-maxMessages);
				this.messages = messages;
			}

			//If it's a raid, save it so we can do an SO with dedicated streamdeck button
			if(message.type == TwitchatDataTypes.TwitchatMessageType.RAID) sStream.lastRaider = message.user;

			//If it's a follow event, flag user as a follower
			if(message.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING) sUsers.flagAsFollower(message.user);

			//If it's a subgift, merge it with potential previous ones
			if(message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION && message.is_gift) {
				for (let i = 0; i < messages.length; i++) {
					const m = messages[i];
					if(m.type != TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION) continue;
					//If the message is a subgift from the same user and happened
					//in the last 5s, merge it.
					if(m.tier && m.user.id == message.user.id
					&& Date.now() - m.date < 5000) {
						if(!m.gift_recipients) m.gift_recipients = [];
						m.date = Date.now();//Update timestamp
						m.gift_recipients.push(message.gift_recipients![0]);
						return;
					}
				}
			}

			//Search in the last 50 messages if this message has already been sent
			//If so, just increment the previous one
			if(sParams.features.groupIdenticalMessage.value === true && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				const len = messages.length;
				const end = Math.max(0, len - 50);
				for (let i = len-1; i > end; i--) {
					const m = messages[i];
					if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) continue;
					if(m.user.id == message.user.id
					&& (m.date > Date.now() - 30000 || i > len-20)//"i > len-20" more or less means "if message is still visible on screen"
					&& message.message.toLowerCase() == m.message.toLowerCase()) {
						if(!m.occurrenceCount) m.occurrenceCount = 0;
						m.occurrenceCount ++;
						//Update timestamp
						m.date = Date.now();
						//Bring it back to bottom
						messages.splice(i, 1);
						messages.push(m);
						this.messages = messages;	
						return;
					}
				}
			}

			//If it's a text message and user isn't a follower, broadcast to WS
			if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
			&& message.user.id
			&& sUsers.followingStates[message.user.id] === false) {
				//TODO Broadcast to OBS-ws
				// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_NON_FOLLOWER, {message:wsMessage});
			}

			//Check if the message contains a mention
			if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE && message.hasMention) {
				//TODO Broadcast to OBS-ws
				// PublicAPI.instance.broadcast(TwitchatEvent.MENTION, {message:wsMessage});
			}

			//If it's the first message today for this user
			if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE && message.todayFirst === true) {
				//TODO Broadcast to OBS-ws
				// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FIRST, {message:wsMessage});
			}

			//If it's the first message all time of the user
			if(message.type == "message" && message.twitch_isFirstMessage) {
				//TODO Broadcast to OBS-ws
				// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FIRST_ALL_TIME, {message:wsMessage});
			}
			
			//Is it a tracked user ?
			if(message.type == "message") {
				const trackedUser = sUsers.trackedUsers.find(v => v.user.id == message.user.id);
				if(trackedUser) {
					trackedUser.messages.push(message);
				}
			}

			//Push some messages to activity feed
			if(message.type == TwitchatDataTypes.TwitchatMessageType.POLL
			|| message.type == TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN
			|| message.type == TwitchatDataTypes.TwitchatMessageType.CHEER
			|| message.type == TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE
			|| message.type == TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION
			|| message.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING
			|| message.type == TwitchatDataTypes.TwitchatMessageType.TIMEOUT
			|| message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION
			|| message.type == TwitchatDataTypes.TwitchatMessageType.REWARD
			|| message.type == TwitchatDataTypes.TwitchatMessageType.RAID
			|| message.type == TwitchatDataTypes.TwitchatMessageType.BAN
			|| message.type == TwitchatDataTypes.TwitchatMessageType.PREDICTION
			|| message.type == TwitchatDataTypes.TwitchatMessageType.BINGO
			|| message.type == TwitchatDataTypes.TwitchatMessageType.RAFFLE
			|| message.type == TwitchatDataTypes.TwitchatMessageType.COUNTDOWN
			|| message.type == TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN
			|| message.type == TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY
			|| (
				sParams.features.keepHighlightMyMessages.value === true
				&& message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
				&& message.twitch_isHighlighted
			)) {
				this.activityFeed.push(message);
			}

			messages.push( message );
			this.messages = messages;
		},
		
		delChatMessage(messageId:string, deleter?:TwitchatDataTypes.TwitchatUser) { 
			const list = this.messages.concat();
			const keepDeletedMessages = StoreProxy.params.filters.keepDeletedMessages.value;
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(messageId == m.id) {
					if(m.type == TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD) {
						//Called if closing an ad
						list.splice(i, 1);
					}else if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						//TODO Broadcast to OBS-ws
						// const wsMessage = {
						// 	channel:m.channel,
						// 	message:m.message,
						// 	tags:m.tags,
						// }
						// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, {message:wsMessage});
	
						if(!m.twitch_automod//Don't keep automod form message
						&& keepDeletedMessages === true) {
							//Just flag as deleted but keep it
							m.deleted = true;
							if(deleter) {
								m.deletedData = { deleter };
							}
						}else{
							//Remove message from list
							list.splice(i, 1);
						}
					}
					break;
				}
			}
			this.messages = list;
		},

		delUserMessages(uid:string) {
			const keepDeletedMessages = StoreProxy.params.filters.keepDeletedMessages.value;
			const list = this.messages.concat();
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
				&& m.user.id == uid) {
					//TODO Broadcast to OBS-ws
					// const wsMessage = {
					// 	channel:list[i].channel,
					// 	message:list[i].message,
					// 	tags:list[i].tags,
					// }
					// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, {message:wsMessage});

					//Delete message from list
					if(keepDeletedMessages === true) {
						m.deleted = true;
					}else{
						list.splice(i, 1);
						i--;
					}
				}
			}
			this.messages = list;
		},

		setEmoteSelectorCache(payload:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchDataTypes.Emote[]}[]) { this.emoteSelectorCache = payload; },

		closeWhispers( userID:string) {
			delete this.whispers[userID];
		},

		doSearchMessages(value:string) { this.$state.searchMessages = value; },

		updateBotMessage(value:{key:TwitchatDataTypes.BotMessageField, enabled:boolean, message:string}) {
			this.botMessages[value.key].enabled = value.enabled;
			this.botMessages[value.key].message = value.message;
			DataStore.set(DataStore.BOT_MESSAGES, this.botMessages);
		},

		async shoutout(source:TwitchatDataTypes.ChatSource, user:TwitchatDataTypes.TwitchatUser) {
			let message:string|null = null;
			let streamTitle = "";
			let streamCategory = "";
			if(source == "twitch") {
				const userInfos = await TwitchUtils.loadUserInfo(user.id? [user.id] : undefined, user.login? [user.login] : undefined);
				if(userInfos?.length > 0) {
					const channelInfo = await TwitchUtils.loadChannelInfo([userInfos[0].id]);
					message = this.botMessages.shoutout.message;
					streamTitle = channelInfo[0].title;
					streamCategory = channelInfo[0].game_name;
					if(!streamTitle) streamTitle = "no stream found"
					if(!streamCategory) streamCategory = "no stream found"
					message = message.replace(/\{USER\}/gi, userInfos[0].display_name);
					message = message.replace(/\{URL\}/gi, "twitch.tv/"+userInfos[0].login);
					message = message.replace(/\{TITLE\}/gi, streamTitle);
					message = message.replace(/\{CATEGORY\}/gi, streamCategory);
				}
			}
			if(message){
				await MessengerProxy.instance.sendMessage(message);
				
				if(user) {
					const trigger:TwitchatDataTypes.ShoutoutTriggerData = {
						type: "shoutout",
						user,
						stream:{
							title:streamTitle,
							category:streamCategory,
						},
					};
					TriggerActionHandler.instance.onMessage(trigger)
				}
			}else{
				//Warn user doesn't exist
				StoreProxy.main.alert = "User "+user+" doesn't exist.";
			}
		},
		
		setChatHighlightOverlayParams(params:TwitchatDataTypes.ChatHighlightOverlayData) {
			this.chatHighlightOverlayParams = params;
			DataStore.set(DataStore.CHAT_HIGHLIGHT_PARAMS, params);
		},
		
		setSpoilerParams(params:TwitchatDataTypes.SpoilerParamsData) {
			this.spoilerParams = params;
			DataStore.set(DataStore.SPOILER_PARAMS, params);
		},
		
		pinMessage(message:TwitchatDataTypes.ChatMessageTypes) { this.pinedMessages.push(message); },
		
		unpinMessage(message:TwitchatDataTypes.ChatMessageTypes) {
			this.pinedMessages.forEach((v, index)=> {
				if(v.id == message.id) {
					this.pinedMessages.splice(index, 1);
				}
			})
		},
		
		async highlightChatMessageOverlay(message:TwitchatDataTypes.ChatMessageTypes|null) {
			let data:TwitchatDataTypes.ChatHighlightInfo|null = null;
			if(message && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE && message.user.id) {
				if(message.source == "twitch"
				&& (!message.user.displayName || !message.user.avatarPath || !message.user.login)) {
					//Get user info
					let [twitchUser] = await TwitchUtils.loadUserInfo([message.user.id]);
					message.user.avatarPath = twitchUser.profile_image_url;
					//Populate more info just in case some are missing
					message.user.login = twitchUser.login;
					message.user.displayName = twitchUser.display_name;
				}
				data = {
					message:message.message_html,
					user:message.user,
					params:this.chatHighlightOverlayParams
				};
				this.isChatMessageHighlighted = true;

				const clonedData:TwitchatDataTypes.ChatHighlightInfo = JSON.parse(JSON.stringify(data));
				clonedData.type = "chatOverlayHighlight";
				TriggerActionHandler.instance.onMessage(clonedData);
			}else{
				this.isChatMessageHighlighted = false;
			}
			
			PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, data as JsonObject);
		},
	} as IChatActions
	& ThisType<IChatActions
		& UnwrapRef<IChatState>
		& _StoreWithState<"chat", IChatState, IChatGetters, IChatActions>
		& _StoreWithGetters<IChatGetters>
		& PiniaCustomProperties
	>,
})