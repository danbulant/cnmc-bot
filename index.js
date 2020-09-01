const config = require("./config.json");
const discord = require("discord.js");
const { app, answers, messages, challenge, points } = require("./src");

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
    if(points.get(member.user.id) && points.get(member.user.id) > 1) return;
    var diff = pointNum - (points.get(member.user.id) || 0);
    points.set(pointNum);
    member.setNickname(member.displayName.replace(/\[([0-9.]+)\]/, (match, num) => {
        return `[${parseFloat(num) + diff}]`;
    }));
}

client.on("messageDelete", msg => {
    if(messages.get(msg.id)) {
        messages.delete(msg.id);
        messages.delete(msg.id);
        var an = answers.get(msg.author.id) || 0;
        if(an) answers.set(msg.author.id, an - 1);
        check(msg.member);
    }
});

client.on("messageReactionAdd", async (react, user) => {
    if(react.message.channel.id !== "745989024099074068") return;
    if(user.id !== "694395936809418816") {
        if(user.id !== client.user.id) {
            await react.users.remove(user);
        }
        return;
    }
    if(user.id === client.user.id) return;
    if(react.emoji.name !== "❌" && react.emoji.name !== "✅") return;
    if(react.emoji.name === "✅") {
        var r = await react.message.reactions.resolve("❌");
        await r.remove();

        var points = 0;

        if(challenge.get("hint")) {
            var msg = await react.message.channel.messages.fetch(challenge.get("hint"));
            if(msg.createdTimestamp < react.message.createdTimestamp) {
                points -= 0.5;
            }
        }

        if(!challenge.get("answered")) {
            challenge.set("answered", 0);
        }
        switch(challenge.get("answered")) {
            case 0:
                points += 2;
                break;
            case 1:
                points += 1.5;
                break;
            case 2:
                points += 1;
                break;
            default:
                points += 0.5;
        }
        challenge.set("answered", challenge.get("answered") + 1);

        if(points > 0) {
            check(react.message.member, points);
        }

        react.message.channel.messages.cache.filter(val => val.author.id === react.message.author.id)
            .filter(val => val.id !== react.message.id)
            .forEach(msg => msg.reactions.removeAll());
    } else {
        var r = await react.message.reactions.resolve("✅");
        await r.remove();
    }
})

client.on("messageUpdate", (msg, msg2) => {
    if(msg.channel.id === "745989024099074068") {
        if(messages.get(msg.id)) {
            messages.delete(msg.id);
            var an = answers.get(msg.author.id) || 0;
            if(an) answers.set(msg.author.id, an - 1);
            check(msg.member);
        }
        msg.author.send("You've edited the messages so it got deleted.");
        msg.delete();
    }
});

client.login(config.token);