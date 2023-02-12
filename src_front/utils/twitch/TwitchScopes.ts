export const TwitchScopes = {
	CHAT_READ: "chat:read",
	CHAT_WRITE: "chat:edit",
	WHISPER_READ: "whispers:read",
	WHISPER_WRITE: "user:manage:whispers",
	SHOUTOUT: "moderator:manage:shoutouts",
	SEND_ANNOUNCE: "moderator:manage:announcements",
	DELETE_MESSAGES: "moderator:manage:chat_messages",
	LIST_CHATTERS: "moderator:read:chatters",
	LIST_REWARDS: "channel:read:redemptions",
	MANAGE_POLLS: "channel:manage:polls",
	MANAGE_PREDICTIONS: "channel:manage:predictions",
	SET_ROOM_SETTINGS: "moderator:manage:chat_settings",
	MODERATE: "channel:moderate",
	READ_MODS_AND_BANNED: "moderation:read",
	EDIT_MODS: "channel:manage:moderators",
	EDIT_VIPS: "channel:manage:vips",
	START_RAID: "channel:manage:raids",
	SET_STREAM_INFOS: "channel:manage:broadcast",
	READ_HYPE_TRAIN: "channel:read:hype_train",
	START_COMMERCIAL: "channel:edit:commercial",
	LIST_SUBS: "channel:read:subscriptions",
	READ_CHEER: "bits:read",
	LIST_FOLLOWERS: "user:read:follows",
	LIST_BLOCKED: "user:read:blocked_users",
	EDIT_BLOCKED: "user:manage:blocked_users",
	EDIT_BANNED: "moderator:manage:banned_users",
	AUTOMOD: "moderator:manage:automod",
	SHIELD_MODE: "moderator:manage:shield_mode",
	CLIPS: "clips:edit"
} as const;
export type TwitchScopesString = typeof TwitchScopes[keyof typeof TwitchScopes];