const { MessageEmbed } = require("discord.js");
const App = require("../lib/middleware");
const app = new App("main");
const commands = require("./commands");

const answers = new Map();
const challenge = new Map();
const points = new Map();

function makeWriteable(object, property) {
    var val;
    var proto = Object.getPrototypeOf(object);
    Object.defineProperty(object, property, {
        get: function () { return typeof val !== "undefined" ? val : proto[property]; },
        set: function(value) { val = value; }
    });
}

app
    .use(msg => !msg.author.bot) // ignore bots
    .use(msg => {
        if(msg.channel.type === "dm") return;
        if(!msg.content.startsWith("!")) return;
        msg.content = msg.content.substr(1);
        makeWriteable(msg, "guild");
        msg.guild = msg.client.guilds.resolve("745985920116850781");
        commands.message(msg);
        return false;
    })
    .use(async msg => {
        if(!challenge.get("type")) challenge.set("type", null);
        if(msg.author.id === "694395936809418816" && msg.content === "!reset") {
            answers.clear();
            challenge.clear();
            points.clear();
            msg.reply("Done.");
            return false;
        } else if(msg.author.id === "694395936809418816" && msg.content === "!end") {
            challenge.set("type", 0);
            msg.reply("Done.");
            return false;
        } else if(msg.author.id === "694395936809418816" && msg.content === "!hint") {
            challenge.set("hint", msg.channel.id + "|" + msg.id);
            msg.reply("Done.");
            return false;
        } else if(msg.author.id === "694395936809418816" && msg.content.startsWith("!start")) {
            var num = msg.content.split(" ")[1][0];
            if(isNaN(parseInt(num))) {
                msg.reply("Invalid type, must start with a number");
                return false;
            }
            challenge.set("num", num);
            challenge.set("type", msg.content.split(" ")[1]);
            msg.reply("challenge type set.");
            return false;
        }
    })
    .use(msg => msg.channel.type === "dm")
    .use(async msg => {
        msg.cguild = await msg.client.guilds.fetch("745985920116850781");
        msg.cmember = await msg.cguild.members.fetch(msg.author.id);
    })
    .use(msg => {
        if(!/^\[[0-9.]+\]/.test(msg.cmember.displayName)) {
            msg.author.send("You must register first");
            return false;
        }
    })
    .use(msg => {
        if(!challenge.get("type")) {
            msg.author.send("No challenge is currently active.");
            return false;
        }
    })
    .use(msg => {
        var answerCount = answers.get(msg.author.id) || 0;
        if(answerCount >= 3) {
            msg.author.send("You've already used all your attempts for challenge `" + challenge.get("type") + "`.");
            return false;
        }
    })
    .use(msg => {
        if(!msg.content.startsWith(challenge.get("type") + ". ")) {
            msg.author.send("Invalid format. The question must start with challenge number: `" + challenge.get("type") + ". <answer>`.");
            return false;
        }
    })
    .use(async msg => {
        var answerCount = answers.get(msg.author.id) || 0;
        answerCount++;
        answers.set(msg.author.id, answerCount);
        if(answerCount > 3) return await msg.delete();
        if(answerCount === 3) {
            await msg.author.send("You've used all your 3 answers, you won't be able to add any more.");
        } else {
            await msg.author.send("Answer recorded, wait for results.");
        }
        console.log("New answer:", msg.content, "by", msg.cmember.displayName);
        var channel = msg.cguild.channels.resolve("750720332943458648");
        var embed = new MessageEmbed();
        embed.setTitle("New answer");
        embed.setDescription(msg.content.match(/[0-9]+\. (.*)/)[1]);
        embed.setAuthor(msg.cmember.displayName, msg.author.avatarURL());
        embed.setFooter(msg.author.id);
        embed.addField("Try", answerCount, true);
        embed.addField("Challenge", challenge.get("type"), true);
        var hint = false;
        try {
            if(challenge.get("hint")) {
                let hint = challenge.get("hint").split("|");
                let ch = await client.channels.fetch(hint[0]);
                let ms = await ch.messages.fetch(hint[1]);
                if(ms.createdTimestamp < msg.createdTimestamp) {
                    hint = true;
                }
            }
        } catch(e) {}
        embed.addField("After hint", hint ? "Yes" : "No", true);
        var m = await channel.send(embed);
        m.react("✅");
        m.react("❌");
    })

module.exports = { app, answers, challenge, points };