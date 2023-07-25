import Ajv from "ajv";


/**
 * Data schema to make sure people don't send random or invalid data to the server
 */
 const UserDataSchema = {
	$id: "http://twitchat.fr/schemas/defs.json",
	definitions: {
		permissions: {
			type:"object",
			additionalProperties: false,
			properties: {
				broadcaster: {type:"boolean"},
				mods: {type:"boolean"},
				vips: {type:"boolean"},
				subs: {type:"boolean"},
				follower: {type:"boolean"},
				follower_duration_ms: {type:"integer", minimum:0, maximum:100 * 365 * 24 * 60 * 60 * 1000},
				all: {type:"boolean"},
				usersAllowed: {
					type:"array",
					minItems:0,
					maxItems:10000,
					items:{type:"string", maxLength:40},
				},
				usersRefused: {
					type:"array",
					minItems:0,
					maxItems:10000,
					items:{type:"string", maxLength:40},
				},
				users: {type:"string", maxLength:1000000},//Keep it a little, remove it once most of the users have migrated their data
			}
		},
		conditionGroup: {
			type:"object",
			additionalProperties: false,
			properties: {
				id: {type:"string", maxLength:50},
				type: {type:"string", maxLength:15},
				operator: {type:"string", maxLength:15},
				conditions:{
					type:"array",
					minItems:0,
					maxItems:100,
					items: {
						anyOf: [
								{ $ref: "#/definitions/condition" },
								{ $ref: "#/definitions/conditionGroup" },
							]
						}
				}
			}
		},
		condition: {
			type:"object",
			additionalProperties: false,
			properties: {
				id: {type:"string", maxLength:50},
				type: {type:"string", maxLength:15},
				placeholder: {type:"string", maxLength:100},
				operator: {type:"string", maxLength:20},
				value: {type:"string", maxLength:500},
			}
		},
		botMessage: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				allowAnon: {type:"boolean"},
				message: {type:"string", maxLength:500},
				cooldown: {type:"integer", minimum:0, maximum:3600},
			}
		},
	},

	type:"object",
	additionalProperties: false,
	properties:{
		obsConnectionEnabled: {type:"boolean"},
		obsConf_muteUnmute: {
			type:"object",
			properties: {
				audioSourceName:{type:"string", maxLength:500},
				muteCommand:{type:"string", maxLength:500},
				unmuteCommand:{type:"string", maxLength:500},
			}
		},
		obsConf_permissions: { $ref: "defs.json#/definitions/permissions" },
		obsConf_scenes: {
			type:"array",
			minItems:0,
			maxItems:10000,
			items:{
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
		},
		triggers: {
			type:"array",
			minItems:0,
			maxItems:10000,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {type:"string", maxLength:50},
					type: {type:"string", maxLength:5},
					enabled: {type:"boolean"},
					addToContextMenu: {type:"boolean"},
					rewardId:{type:"string", maxLength:100},
					name:{type:"string", maxLength:100},
					chatCommand:{type:"string", maxLength:100},
					scheduleName:{type:"string", maxLength:100},
					obsSource:{type:"string", maxLength:200},
					obsScene:{type:"string", maxLength:200},
					obsInput:{type:"string", maxLength:200},
					obsFilter:{type:"string", maxLength:200},
					goxlrButtons:{
						type:"array",
						minItems:0,
						maxItems:24,
						items: {type:"string", maxLength:20},
					},
					counterId: {type:"string", maxLength:50},
					queue: {type:"string", maxLength:100},
					conditions: { $ref: "#/definitions/conditionGroup" },
					permissions: { $ref: "defs.json#/definitions/permissions" },
					heatAllowAnon: {type:"boolean"},
					heatObsSource: {type:"string", maxLength:100},
					heatClickSource: {type:"string", maxLength:10},
					heatAreaIds:{
										type:"array",
										minItems:0,
										maxItems:100,
										items:{type:"string", maxLength:40},
									},
					chatCommandAliases:{
										type:"array",
										minItems:0,
										maxItems:10,
										items:{type:"string", maxLength:50},
									},
					chatCommandParams:{
										type:"array",
										minItems:0,
										maxItems:30,
										items:{
											type: "object",
											additionalProperties: false,
											properties: {
												type:{type:"string", maxLength:20},
												tag:{type:"string", maxLength:50},
											}
										},
									},
					scheduleParams: {
						type:"object",
						properties: {
							type: {type:"string", maxLength:10},
							repeatDuration: {type:"integer", minimum:0, maximum:48*60},
							repeatMinMessages: {type:"integer", minimum:0, maximum:9999},
							dates:{
								type:"array",
								minItems:0,
								maxItems:10000,
								items: {
									type: "object",
									additionalProperties: false,
									properties: {
										daily: {type:"boolean"},
										monthly: {type:"boolean"},
										yearly: {type:"boolean"},
										value: {type:"string", maxLength:20},
									}
								}
							}
						}
					},
					cooldown: {
						type:"object",
						properties: {
							global: {type:"integer", minimum:0, maximum:60*60*12},
							user: {type:"integer", minimum:0, maximum:60*60*12},
							alert: {type:"boolean"},
						}
					},
					actions:{
						type:"array",
						minItems:0,
						maxItems:100,
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								id: {type:"string", maxLength:100},
								sourceName: {type:"string", maxLength:100},
								//remove this property after some time
								show: {
									anyOf:[
										{type:"string", maxLength:20},
										{type:"boolean"},
									]
								},
								action: {type:"string", maxLength:20},
								triggerId: {type:"string", maxLength:50},
								delay: {type:"integer"},
								filterName: {type:"string", maxLength:100},
								text: {type:"string", maxLength:500},
								url: {type:"string", maxLength:1000},
								mediaPath: {type:"string", maxLength:1000},
								type: {type:"string", maxLength:50},
								musicAction: {type:"string", maxLength:3},
								track: {type:"string", maxLength:500},
								confirmMessage: {type:"string", maxLength:500},
								playlist: {type:"string", maxLength:500},
								voiceID: {type:"string", maxLength:100},
								triggerKey: {type:"string", maxLength:100},
								method: {type:"string", maxLength:10},
								addValue: {type:"string", maxLength:100},
								counter: {type:"string", maxLength:40},
								counterUserSources: {
									type:"object",
									additionalProperties: false,
									patternProperties: {
									  ".{8}-.{4}-.{4}-.{4}-.{12}": {type: "string"},
									},
								},
								placeholder:{type:"string", maxLength:20},
								outputPlaceholder:{type:"string", maxLength:20},
								min: {type:"integer", minimum:-Number.MAX_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
								max: {type:"integer", minimum:-Number.MAX_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
								float: {type:"boolean"},
								condition: {type:"boolean"},
								skipDisabled: {type:"boolean"},
								disableAfterExec: {type:"boolean"},
								mode: {type:"string", maxLength:20},
								title: {type:"string", maxLength:20},
								categoryId: {type:"string", maxLength:30},
								topic: {type:"string", maxLength:255},
								pattern: {type:"string", maxLength:15},
								branded:{type:"boolean"},
								fxPresetIndex:{type:"integer", minimum:0, maximum:5},
								labels:{
									type:"array",
									minItems:0,
									maxItems:10,
									items:{
										type:"object",
										additionalProperties: false,
										properties:{
											id:{type:"string", maxLength:40},
											enabled:{type:"boolean"},
										}
									},
								},
								tags: {
									type:"array",
									minItems:0,
									maxItems:20,
									items:{type:"string", maxLength:10},
								},
								list: {
									type:"array",
									minItems:0,
									maxItems:10000,
									items:{type:"string", maxLength:500},
								},
								triggers: {
									type:"array",
									minItems:0,
									maxItems:1000,
									items:{type:"string", maxLength:100},
								},
								counters: {
									type:"array",
									minItems:0,
									maxItems:100,
									items:{type:"string", maxLength:40},
								},
								queryParams: {
									type:"array",
									minItems:0,
									maxItems:100,
									items:{type:"string", maxLength:50},
								},
								params: {
									type:"array",
									minItems:0,
									maxItems:100,
									items:{type:"string", maxLength:50},
								},
								raffleData: {
									type: "object",
									additionalProperties: false,
									properties: {
										mode: {type:"string", maxLength:20},
										command: {type:"string", maxLength:100},
										reward_id: {type:"string", maxLength:200},
										multipleJoin: {type:"boolean"},
										duration_s: {type:"integer", minimum:0, maximum:120 * 60000},
										maxEntries: {type:"integer", minimum:0, maximum:1000000},
										created_at: {type:"integer", minimum:0, maximum:9999999999999},
										entries: {
											type:"array",
											minItems:0,
											maxItems:10000,
											items: {
												type: "object",
												additionalProperties: false,
												properties: {
													id:{type:"string", maxLength:100},
													label:{type:"string", maxLength:200},
													score:{type:"integer", minimum:0, maximum:100},
												}
											}
										},
										followRatio: {type:"integer", minimum:0, maximum:100},
										vipRatio: {type:"integer", minimum:0, maximum:100},
										subRatio: {type:"integer", minimum:0, maximum:100},
										subT2Ratio: {type:"integer", minimum:0, maximum:100},
										subT3Ratio: {type:"integer", minimum:0, maximum:100},
										subgiftRatio: {type:"integer", minimum:0, maximum:100},
										subMode_includeGifters: {type:"boolean"},
										subMode_excludeGifted: {type:"boolean"},
										showCountdownOverlay: {type:"boolean"},
										customEntries: {type:"string", maxLength:1000000},
									},
								},
								bingoData: {
									type: "object",
									additionalProperties: false,
									properties: {
										guessNumber: {type:"boolean"},
										guessEmote: {type:"boolean"},
										guessCustom: {type:"boolean"},
										min: {type:"integer", minimum:0, maximum:999999999},
										max: {type:"integer", minimum:0, maximum:999999999},
										customValue: {type:"string", maxLength:1000000},
									}
								},
								pollData: {
									type: "object",
									additionalProperties: false,
									properties: {
										pointsPerVote: {type:"integer", minimum:0, maximum:999999999},
										voteDuration: {type:"integer", minimum:0, maximum:999999999},
										title: {type:"string", maxLength:60},
										answers: {
											type:"array",
											minItems:0,
											maxItems:50,
											items:{type:"string", maxLength:25},
										},
									}
								},
								predictionData: {
									type: "object",
									additionalProperties: false,
									properties: {
										voteDuration: {type:"integer", minimum:0, maximum:999999999},
										title: {type:"string", maxLength:60},
										answers: {
											type:"array",
											minItems:0,
											maxItems:50,
											items:{type:"string", maxLength:25},
										},
									}
								},
								suggData: {
									type: "object",
									additionalProperties: false,
									properties: {
										command: {type:"string", maxLength:30},
										maxLength: {type:"integer", minimum:0, maximum:500},
										duration: {type:"integer", minimum:0, maximum:1440},
										allowMultipleAnswers: {type:"boolean"},
										startTime: {type:"integer", maximum:999999999999999},
										choices: {
											type:"array",
											minItems:0,
											maxItems:0,
											items: {type:"string", maxLength:0},//Not the right type but it will never be filled
										},
										winners: {
											type:"array",
											minItems:0,
											maxItems:0,
											items: {type:"string", maxLength:0},//Not the right type but it will never be filled
										},
									}
								}
							}
						},
					}
				}
			}
		},
		botMessages: {
			type:"object",
			additionalProperties: false,
			properties: {
				raffleStart: { $ref: "#/definitions/botMessage" },
				raffleJoin: { $ref: "#/definitions/botMessage" },
				raffle: { $ref: "#/definitions/botMessage" },
				bingoStart: { $ref: "#/definitions/botMessage" },
				bingo: { $ref: "#/definitions/botMessage" },
				shoutout: { $ref: "#/definitions/botMessage" },
				twitchatAd: { $ref: "#/definitions/botMessage" },
				chatSuggStart: { $ref: "#/definitions/botMessage" },
				heatSpotify: { $ref: "#/definitions/botMessage" },
				heatUlule: { $ref: "#/definitions/botMessage" },
			}
		},
		voiceActions: {
			type:"array",
			minItems:0,
			maxItems:1000,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {type:"string", maxLength:100},
					sentences: {type:"string", maxLength:1000000},
				}
			},
		},
		voiceLang: {type:"string", maxLength:20},
		streamInfoPresets:{
			type:"array",
			minItems:0,
			maxItems:1000,
			items: {
				type:"object",
				additionalProperties: false,
				properties:{
					name:{type:"string", maxLength:50},
					id:{type:"string", maxLength:40},
					title:{type:"string", maxLength:200},
					categoryID:{type:"string", maxLength:10},
					branded:{type:"boolean"},
					tags:{
						type:"array",
						minItems:0,
						maxItems:30,
						items:{type:"string", maxLength:100},
					},
					labels:{
						type:"array",
						minItems:0,
						maxItems:10,
						items:{
							type:"object",
							additionalProperties: false,
							properties:{
								id:{type:"string", maxLength:40},
								enabled:{type:"boolean"},
							}
						},
					},
				}
			}
		},
		"p:bttvEmotes": {type:"boolean"},
		"p:ffzEmotes": {type:"boolean"},
		"p:sevenTVEmotes": {type:"boolean"},
		"p:conversationsEnabled": {type:"boolean"},
		"p:defaultSize": {type:"integer", minimum:0, maximum:21},
		"p:displayTime": {type:"boolean"},
		"p:displayTimeRelative": {type:"boolean"},
		"p:dyslexicFont": {type:"boolean"},
		"p:firstMessage": {type:"boolean"},
		"p:firstUserBadge": {type:"boolean"},
		"p:groupIdenticalMessage": {type:"boolean"},
		"p:highlightMentions": {type:"boolean"},
		"p:highlightMentions_color": {type:"string", maxLength:7, minLength:7},
		"p:highlightMods": {type:"boolean"},
		"p:highlightMods_color": {type:"string", maxLength:7, minLength:7},
		"p:highlightNonFollowers": {type:"boolean"},
		"p:highlightNonFollowers_color": {type:"string", maxLength:7, minLength:7},
		"p:highlightSubs": {type:"boolean"},
		"p:highlightSubs_color": {type:"string", maxLength:7, minLength:7},
		"p:highlightVips": {type:"boolean"},
		"p:highlightVips_color": {type:"string", maxLength:7, minLength:7},
		"p:highlightPartners": {type:"boolean"},
		"p:highlightPartners_color": {type:"string", maxLength:7, minLength:7},
		"p:highlight1stToday": {type:"boolean"},
		"p:highlight1stToday_color": {type:"string", maxLength:7, minLength:7},
		"p:highlight1stEver": {type:"boolean"},
		"p:highlight1stEver_color": {type:"string", maxLength:7, minLength:7},
		"p:raidHighlightUser": {type:"boolean"},
		"p:raidHighlightUserTrack": {type:"boolean"},
		"p:raidHighlightUserDuration": {type:"integer"},
		"p:raidHighlightUser_color": {type:"string", maxLength:7, minLength:7},
		"p:raffleHighlightUser": {type:"boolean"},
		"p:raffleHighlightUserDuration": {type:"integer"},
		"p:lockAutoScroll": {type:"boolean"},
		"p:liveMessages": {type:"boolean"},
		"p:liveAlerts": {type:"boolean"},
		"p:markAsRead": {type:"boolean"},
		"p:minimalistBadges": {type:"boolean"},
		"p:showBadges": {type:"boolean"},
		"p:showEmotes": {type:"boolean"},
		"p:autoRemod": {type:"boolean"},
		"p:showModTools": {type:"boolean"},
		"p:splitViewVertical": {type:"boolean"},
		"p:showUserPronouns": {type:"boolean"},
		"p:showViewersCount": {type:"boolean"},
		"p:alternateMessageBackground": {type:"boolean"},
		"p:showRaidViewersCount": {type:"boolean"},
		"p:showRaidStreamInfo": {type:"boolean"},
		"p:offlineEmoteOnly": {type:"boolean"},
		"p:stopStreamOnRaid": {type:"boolean"},
		"p:userHistoryEnabled": {type:"boolean"},
		"p:translateNames": {type:"boolean"},
		"p:spoilersEnabled": {type:"boolean"},
		"p:alertMode": {type:"boolean"},
		"p:chatShoutout": {type:"boolean"},
		"p:showRewardsInfos": {type:"boolean"},
		"p:censorDeletedMessages": {type:"boolean"},
		v: {type:"integer"},
		collapseParamAdInfo: {type:"boolean"},
		lang: {type:"string", maxLength:4},
		theme: {type:"string", maxLength:10},
		obsIP: {type:"string", maxLength:20},
		obsPort: {type:"integer", minimum:0, maximum:65535},
		updateIndex: {type:"integer"},
		raffle_message: {type:"string", maxLength:500},
		raffle_messageEnabled: {type:"boolean"},
		bingo_message: {type:"string", maxLength:500},
		bingo_messageEnabled: {type:"boolean"},
		greetScrollDownAuto: {type:"boolean"},
		greetAutoDeleteAfter: {type:"integer", minimum:-1, maximum:3600},
		devmode: {type:"boolean"},
		greetHeight: {type:"number"},
		adNextTS: {type:"integer"},
		adWarned: {type:"boolean"},
		sponsorPublicPrompt: {type:"boolean"},
		cypherKey: {type:"string", maxLength:500},
		raffle_showCountdownOverlay: {type:"boolean"},
		donorLevel: {type:"integer", minimum:-1, maximum:10},
		rightClickHintPrompt: {type:"boolean"},
		triggerSortType: {type:"string", maxLength:20},
		ululeProject: {type:"string", maxLength:200},
		ululeGoals: {type:"string", maxLength:200},
		ululeTitle: {type:"string", maxLength:100},
		ululeCurrency: {type:"string", maxLength:2},
		heatEnabled: {type:"boolean"},
		goxlrEnabled: {type:"boolean"},
		customUsernames: {
			type:"object",
			additionalProperties: false,
			maxProperties:1000,
			patternProperties: {
			  ".{1,20}": {type: "string", maxLength:25}
			},
		},
		customBadgeList: {
			type:"object",
			additionalProperties: false,
			maxProperties:100,
			patternProperties: {
				".{40}": {type: "string", maxLength:6000}
			},
		},
		customUserBadges: {
			type:"object",
			additionalProperties: false,
			maxProperties:1000,
			patternProperties: {
			  ".{1,10}": {
					type:"array",
					minItems:0,
					maxItems:100,
					items:{
						type:"object",
						additionalProperties: false,
						properties: {
							id: {type:"string", maxLength:40},
							platform: {type:"string", maxLength:15},
						},
					},
				},
			},
		},
		ttsParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				volume: {type:"number", minimum:0, maximum:1},
				rate: {type:"number", minimum:0.1, maximum:10},
				pitch: {type:"number", minimum:0, maximum:2},
				maxLength: {type:"integer", minimum:0, maximum:500},
				maxDuration: {type:"integer", minimum:0, maximum:120},
				timeout: {type:"integer", minimum:0, maximum:300},
				inactivityPeriod: {type:"integer", minimum:0, maximum:60},
				voice: {type:"string", maxLength:500},
				removeURL: {type:"boolean"},
				replaceURL: {type:"string", maxLength:100},
				removeEmotes: {type:"boolean"},
				readMessages:{type:"boolean"},
				readMessagePatern: {type:"string", maxLength:300},
				readWhispers:{type:"boolean"},
				readWhispersPattern: {type:"string", maxLength:300},
				readNotices:{type:"boolean"},
				readNoticesPattern: {type:"string", maxLength:300},
				readRewards: {type:"boolean"},
				readRewardsPattern: {type:"string", maxLength:300},
				readSubs: {type:"boolean"},
				readSubsPattern:{type:"string", maxLength:300},
				readSubgifts: {type:"boolean"},
				readSubgiftsPattern:{type:"string", maxLength:300},
				readBits: {type:"boolean"},
				readBitsMinAmount: {type:"integer", minimum:0, maximum:1000000},
				readBitsPattern:{type:"string", maxLength:300},
				readRaids: {type:"boolean"},
				readRaidsPattern:{type:"string", maxLength:300},
				readFollow: {type:"boolean"},
				readFollowPattern:{type:"string", maxLength:300},
				readPolls: {type:"boolean"},
				readPollsPattern:{type:"string", maxLength:300},
				readPredictions: {type:"boolean"},
				readPredictionsPattern:{type:"string", maxLength:300},
				readBingos: {type:"boolean"},
				readBingosPattern:{type:"string", maxLength:300},
				readRaffle: {type:"boolean"},
				readRafflePattern:{type:"string", maxLength:300},
				readAutomod: {type:"boolean"},
				readAutomodPattern:{type:"string", maxLength:300},
				read1stMessageToday: {type:"boolean"},
				read1stMessageTodayPattern:{type:"string", maxLength:300},
				read1stTimeChatters: {type:"boolean"},
				read1stTimeChattersPattern:{type:"string", maxLength:300},
				readTimeouts: {type:"boolean"},
				readTimeoutsPattern: {type:"string", maxLength:300},
				readBans: {type:"boolean"},
				readBansPattern: {type:"string", maxLength:300},
				readUnbans: {type:"boolean"},
				readUnbansPattern: {type:"string", maxLength:300},
				readUsers:{
					type:"array",
					minItems:0,
					maxItems:10000,
					items:{type:"string", maxLength:50},
				},
				ttsPerms:{ $ref: "defs.json#/definitions/permissions" },
			}
		},
		emergencyParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled:{type:"boolean"},
				chatCmd:{type:"string", maxLength:100},
				chatCmdPerms:{ $ref: "defs.json#/definitions/permissions" },
				slowMode:{type:"boolean"},
				emotesOnly:{type:"boolean"},
				subOnly:{type:"boolean"},
				followOnly:{type:"boolean"},
				noTriggers:{type:"boolean"},
				followOnlyDuration:{type:"integer"},
				slowModeDuration:{type:"integer"},
				toUsers:{
					type:"array",
					minItems:0,
					maxItems:1000,
					items:{type:"string", maxLength:50},
				},
				obsScene:{type:"string", maxLength:500},
				obsSources:{
					type:"array",
					minItems:0,
					maxItems:1000,
					items:{type:"string", maxLength:100},
				},
				autoEnableOnFollowbot:{type:"boolean"},
				autoEnableOnShieldmode:{type:"boolean"},
				enableShieldMode:{type:"boolean"},
			}
		},
		emergencyFollowers: {
			type:"array",
			minItems:0,
			maxItems:100,
			items: {
				type:"object",
				additionalProperties: false,
				properties: {
					uid:{type:"string", maxLength:50},
					channelId:{type:"string", maxLength:50},
					login:{type:"string", maxLength:50},
					date:{type:"integer"},
					platform:{type:"string", maxLength:15},
				}
			}
		},
		spoilerParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				permissions:{ $ref: "defs.json#/definitions/permissions" },
				autoSpoilNewUsers:{type:"boolean"},
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
				vibrate: {type:"boolean"},
				permissions:{ $ref: "defs.json#/definitions/permissions" },
			}
		},
		
		musicPlayerParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				noScroll: {type:"boolean"},
				autoHide: {type:"boolean"},
				erase: {type:"boolean"},
				showCover: {type:"boolean"},
				showArtist: {type:"boolean"},
				showTitle: {type:"boolean"},
				showProgressbar: {type:"boolean"},
				openFromLeft: {type:"boolean"},
				customInfoTemplate: {type:"string", maxLength:1000000},
			}
		},

		voicemodParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				voiceIndicator: {type:"boolean"},
				commandToVoiceID:{
					type:"object",
					additionalProperties: true,
					patternProperties: {
						".*": {type:"string", maxLength:100},
					}
				},
				chatCmdPerms:{ $ref: "defs.json#/definitions/permissions" },
			}
		},

		automodParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				banUserNames: {type:"boolean"},
				exludedUsers: { $ref: "defs.json#/definitions/permissions" },
				keywordsFilters:{
					type:"array",
					minItems:0,
					maxItems:100,
					items: {
						type:"object",
						additionalProperties: false,
						properties: {
							id: {type:"string", maxLength:36},
							label: {type:"string", maxLength:100},
							regex: {type:"string", maxLength:5000},
							enabled: {type:"boolean"},
							serverSync: {type:"boolean"},
							emergency: {type:"boolean"},
							firstTimeChatters: {type:"boolean"},
						}
					}
				},
			}
		},

		chatColumnsConf: {
			type:"array",
			minItems:0,
			maxItems:100,
			items: {
				type:"object",
				additionalProperties: false,
				properties: {
					id: {type:"string", maxLength:40},
					commandsBlockList: {
						type:"array",
						minItems:0,
						maxItems:10000,
						items:{type:"string", maxLength:100},
					},
					userBlockList: {
						type:"array",
						minItems:0,
						maxItems:10000,
						items:{type:"string", maxLength:40},
					},
					liveLockCount: {type:"integer", minimum:0, maximum:10},
					order: {type:"integer", minimum:0, maximum:1000},
					size: {type:"number", minimum:0, maximum:10},
					whispersPermissions: { $ref: "defs.json#/definitions/permissions" },
					showPanelsHere: { type:"boolean" },
					filters:{
						type:"object",
						additionalProperties: true,
						patternProperties: {
							".*": { type:"boolean" }
						}
					},
					messageFilters:{
						type:"object",
						additionalProperties: true,
						patternProperties: {
							".*": { type:"boolean" }
						}
					}
				}
			}
		},

		counters: {
			type:"array",
			minItems:0,
			maxItems:10000,
			items:{
				type:"object",
				additionalProperties: false,
				properties:{
					id: {type:"string", maxLength:40},
					name: {type:"string", maxLength:50},
					placeholderKey: {type:"string", maxLength:15},
					value: {type:"integer", minimum:-Number.MAX_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
					min: {
						anyOf:[
							{type:"integer", minimum:-Number.MAX_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
							{type:"boolean"},
						]
					},
					max: {
						anyOf:[
							{type:"integer", minimum:-Number.MAX_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
							{type:"boolean"},
						]
					},
					loop: {type:"boolean"},
					perUser: {type:"boolean"},
					users: {
						type:"object",
						additionalProperties: true,
						patternProperties: {
							".*": {type:"integer", minimum:-Number.MAX_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
						}
					}
				}
			}
		},

		websocketTrigger: {
			type:"object",
			additionalProperties: false,
			properties: {
				ip: {type:"string", maxLength:100},
				port: {type:"string", maxLength:10},
				secured: {type:"boolean"},
			}
		},

		heatScreens: {
			type:"object",
			additionalProperties: false,
			properties: {
				id: {type:"string", maxLength:40},
				enabled: {type:"boolean"},
				activeOBSScene: {type:"string", maxLength:100},
				areas: {
					type:"object",
					additionalProperties: false,
					properties: {
						id: {type:"string", maxLength:40},
						points: {
							type:"object",
							additionalProperties: false,
							properties: {
								x: {type:"number", minimum:0, maximum:1},
								y: {type:"number", minimum:0, maximum:1},
							}
						},
					}
				},
			}
		},
	}
}

const ajv = new Ajv({
	strictTuples: true,
	verbose:true,
	removeAdditional:true,
	discriminator:true,
	allErrors:true,
	strictNumbers:true,
	strict:true,
});

export const schemaValidator = ajv.compile( UserDataSchema );