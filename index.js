const config = require("./config.json");
const discord = require("discord.js");
const { app, answers, challenge, points } = require("./src");

const client = new discord.Client({
    presence: {
        status: "online",
        activity: {
            name: "CNMC",
            type: "PLAYING"
        }
    }
});

client.on("ready", () => {
    console.log("Ready");
});

client.on("message", async msg => {
    try {
        await app.message(msg);
    } catch(e) {
        console.error("APP", e);
    }
});

function check(member, bonus = 0) {
    var pointNum = bonus + (answers.get(member.user.id) ? (0.5 + ((challenge.get("num") || 1) * 0.5)) : 0);
    if(points.get(member.user.id) === pointNum) return;
    if(points.get(member.user.id) && pointNum < points.get(member.user.id)) return;
    var diff = pointNum - (points.get(member.user.id) || 0);
    points.set(pointNum);
    member.setNickname(member.displayName.replace(/\[([0-9.]+)\]/, (match, num) => {
        return `[${parseFloat(num) + diff}]`;
    }));
}

/**
 * @param {discord.Collection<string, any>} arr 
 * @param {(val: any) => boolean} predicate
 * @returns {discord.Collection<string, any>}
 *//**
 * @param {discord.Collection<string, discord.Message>} arr 
 * @param {(val: discord.Message) => boolean} predicate
 * @returns {discord.Collection<string, discord.Message>}
 */
async function asyncFilter(arr, predicate) {
    var mapped = arr.mapValues(predicate);
    var keys = Array.from(mapped.keys());
    const results = await Promise.all(mapped.values());

    var col = new discord.Collection();
    for(var key in results) {
        col.set(keys[key], results[key]);
    }

	return arr.filter((_v, index) => col.get(index));
}

client.on("messageReactionAdd", async (react, user) => {
    if(react.message.channel.id !== "750720332943458648") return;
    if(user.id === client.user.id) return;
    if(!react.message.embeds.length) return;
    if(react.emoji.name !== "❌" && react.emoji.name !== "✅") return;
    if(react.emoji.name === "✅") {
        var r = await react.message.reactions.resolve("❌");
        await r.remove();

        var points = 0;
        var hint = false;

        if(challenge.get("hint")) {
            var msg = await react.message.channel.messages.fetch(challenge.get("hint"));
            if(msg.createdTimestamp < react.message.createdTimestamp) {
                points -= 0.5;
                hint = true;
            }
        }

        if(!challenge.get("answered")) {
            challenge.set("answered", 0);
        }
        var member = await react.message.guild.members.fetch(react.message.embeds[0].footer.text);

        switch(challenge.get("answered")) {
            case 0:
                points += 2;
                member.user.send(`Congratulations! You got the first place at the challenge #${challenge.get("type")} for your answer. ${hint ? "(However you lost 0.5 points because you're answer is given after the ADVANCED HINT)." : ""} You got ${points + (answers.get(member.user.id) ? (0.5 + ((challenge.get("num") || 1) * 0.5)) : 0)} points!`);
                break;
            case 1:
                points += 1.5;
                member.user.send(`Congratulations! You got the second place at the challenge #${challenge.get("type")} for your answer. ${hint ? "(However you lost 0.5 points because you're answer is given after the ADVANCED HINT)." : ""} You got ${points + (answers.get(member.user.id) ? (0.5 + ((challenge.get("num") || 1) * 0.5)) : 0)} points!`);
                break;
            case 2:
                points += 1;
                member.user.send(`Congratulations! You got the third place at the challenge #${challenge.get("type")} for your answer. ${hint ? "(However you lost 0.5 points because you're answer is given after the ADVANCED HINT)." : ""} You got ${points + (answers.get(member.user.id) ? (0.5 + ((challenge.get("num") || 1) * 0.5)) : 0)} points!`);
                break;
            default:
                points += 0.5;
                member.user.send(`Congratulations! You got the right answer for challenge #${challenge.get("type")}. ${hint ? "(However you lost 0.5 points because you're answer is given after the ADVANCED HINT)." : ""} You got ${points + (answers.get(member.user.id) ? (0.5 + ((challenge.get("num") || 1) * 0.5)) : 0)} points!`);
        }
        challenge.set("answered", challenge.get("answered") + 1);

        if(points > 0) {
            check(member, points);
        }

        react.message.channel.messages.cache.filter(val => val.author.id === val.client.user.id)
            .filter(val => val.embeds)
            .filter(val => val.embeds[0].footer.text === react.message.embeds[0].footer.text)
            .filter(val => val.id !== react.message.id)
            .forEach(msg => msg.reactions.removeAll());
    } else {
        var r = await react.message.reactions.resolve("✅");
        await r.remove();
        
        var preFiltered = react.message.channel.messages.cache.filter(val => val.author.id === val.client.user.id)
            .filter(val => val.embeds)
            .filter(val => val.embeds[0].footer.text === react.message.embeds[0].footer.text)
            .filter(val => val.embeds[0].fields[1].value === react.message.embeds[0].fields[1].value)
            .filter(val => val.id !== react.message.id);

        var wrong = (await asyncFilter(
                preFiltered,
                val => {
                    var r = val.reactions.resolve("✅");
                    console.log("r", !r?.count);
                    return !r?.count;
                }
            )).size;

        if(wrong + 1 >= answers.get(react.message.embeds[0].footer.text)) {
            var member = await react.message.guild.members.fetch(react.message.embeds[0].footer.text);
            await member.user.send(`Sadly, none of your answers are correct. But as a gift for joining the challenge #${react.message.embeds[0].fields[1].value}, you still get ${(answers.get(member.user.id) ? (0.5 + ((challenge.get("num") || 1) * 0.5)) : 0)} points!`);
        }

        check(react.message.member, 0);
    }
});

client.login(config.token);