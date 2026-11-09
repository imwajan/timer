import definePlugin from "@utils/types";
import { VoiceStateStore, UserStore, GuildMemberStore } from "@webpack/common";

const times = new Map<string, number>();

function getTimer(userId: string, guildId: string) {
    const user = UserStore.getUser(userId);
    const name = GuildMemberStore.getNick(guildId, userId)
        ?? user?.globalName
        ?? user?.username
        ?? "Unknown";

    const channel = VoiceStateStore.getVoiceStateForUser(userId)?.channelId;
    if (!channel) return name;

    const key = userId + ":" + channel;
    if (!times.has(key)) times.set(key, Date.now());

    const seconds = Math.floor((Date.now() - times.get(key)!) / 1000);
    const time = [
        Math.floor(seconds / 3600),
        Math.floor(seconds / 60) % 60,
        seconds % 60
    ].map(n => String(n).padStart(2, "0")).join(":");

    return name + "  " + time;
}

export default definePlugin({
    name: "WajanTimer",
    description: "Voice timer by Wajan",
    authors: [{ name: "Wajan", id: 0n }],

    patches: [{
        find: "#{intl::GUEST_NAME_SUFFIX})]",
        replacement: {
            match: /#{intl::GUEST_NAME_SUFFIX}.{0,50}?""\](?<=guildId:(\i),.+?user:(\i).+?)/,
            replace: "$&,children:[$self.getTimer($2.id,$1)],"
        }
    }],

    getTimer,

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }) {
            for (const state of voiceStates) {
                const userId = state.userId;
                const channelId = state.channelId;
                const oldChannelId = state.oldChannelId;

                if (channelId === oldChannelId) continue;

                for (const key of times.keys()) {
                    if (key.startsWith(userId + ":")) times.delete(key);
                }

                if (channelId) {
                    times.set(userId + ":" + channelId, Date.now());
                }
            }
        }
    },

    start() {
        times.clear();
    }
});