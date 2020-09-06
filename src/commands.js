const App = require("../lib/middleware");
const app = new App("commands");
const discord = require("discord.js");

/**
 * Gets top members
 * @param {discord.Guild} guild 
 */
function getLeaderboard(guild) {
    return guild.members.cache
        .filter(m => !m.user.bot)
        .filter(m => /\[[0-9.]+\].*/.test(m.displayName))
        .map(m => {
            m.score = parseFloat(m.displayName.match(/\[([0-9.]+)\].*/)[1]);
            return m;
        })
        .map((m, i, self) => {
            m.name = m.displayName.match(/\[[0-9.]+\](.*)/)[1].trim();
            m.rank = self.filter((m, i) => {
                return self.indexOf(self.filter(e => e.score === m.score)[0]) === i;
            }).filter(e => e.score > m.score).length + 1;
            return m;
        })
        .sort((a, b) => b.score - a.score)
}
/**
 * Tests if given string is a number
 * @param {string} str to test
 */
function isNumber(str) {
    if (typeof str != "string") return false;
    return !isNaN(str) && !isNaN(parseFloat(str))
}

/**
 * Gets leaderboard embed
 * @param {discord.Guild} guild 
 * @param {number} page 
 */
function getLeaderboardEmbed(guild, page = 1) {
    page--;
    const leaderboard = getLeaderboard(guild).slice(page * 10, (page + 1) * 10);
    const maxPage = Math.ceil(getLeaderboard(guild).length / 10);
    if(!leaderboard.length) return "Couldn't find any results.";

    const embed = new discord.MessageEmbed();
    embed.setTitle("Leaderboard - Page " + (page+1));
    embed.setDescription(leaderboard
        .map((m, i) => {
            switch(m.rank) {
                case 1:
                    m.rank = ":first_place:";
                    break;
                case 2:
                    m.rank = ":second_place:";
                    break;
                case 3:
                    m.rank = ":third_place:";
                    break;
                default:
                    m.rank += ".";
            }
            return m;
        })
        .map(
            (m, i) => `**${m.rank} ${m.name}** - ${m.score} point${m.score === 1 ? "" : "s"}`
        ).join("\n")
    );
    embed.setFooter(`Page ${page+1} out of ${maxPage}.`);

    return embed;
}

/**
 * Gets user rank embed
 * @param {discord.GuildMember} member 
 * @param {discord.Guild} guild 
 * @param {boolean} motivation
 */
function getUserEmbed(omember, guild, motivation) {
    var leaderboard = getLeaderboard(guild);
    var member = leaderboard.filter(m => m.id === omember.id)[0];
    var index = leaderboard.indexOf(member);

    member.rankNumber = member.rank;

    switch(member.rank) {
        case 1:
            member.rank = ":first_place:";
            break;
        case 2:
            member.rank = ":second_place:";
            break;
        case 3:
            member.rank = ":third_place:";
            break;
    }

    const embed = new discord.MessageEmbed();
    embed.setAuthor(member.name, member.user.avatarURL());
    embed.setDescription(`Rank: **${member.rank}**\nScore: **${member.score}**`)

    if(member.rankNumber !== 1 && motivation) {
        var before = leaderboard.filter((m, i) => {
            return leaderboard.indexOf(leaderboard.filter(e => e.score === m.score)[0]) === i;
        }).filter(e => e.score > member.score).pop();
        embed.setFooter(`\n${before.score - member.score} points needed to get rank ${before.rank}.`);
    }
    return embed;
}

app
    .command("leaderboard :page", async (msg, { page }) => {
        if(!isNumber(page)) return msg.channel.send("Invalid page argument. Use number.");
        msg.channel.send(getLeaderboardEmbed(msg.guild, parseInt(page)));
    })
    .command("leaderboard", async msg => {
        msg.channel.send(getLeaderboardEmbed(msg.guild));
    })
    .command("rank :user", async (msg, { user }) => {
        var members = await msg.guild.members.fetch({
            query: user,
            limit: 5
        });
        if(members.size > 1) {
            return msg.channel.send("Multiple users found, be more specific: " + members.map(m => "`" + m.displayName + "`").join(", ") + ".");
        }
        if(!members.size) return msg.channel.send("Couldn't find any user");
        msg.channel.send(getUserEmbed(members.first(), msg.guild, msg.member.id === members.first().id));
    })
    .command("rank", async msg => {
        msg.channel.send(getUserEmbed(msg.member, msg.guild, true));
    })

module.exports = app;