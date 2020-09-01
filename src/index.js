const App = require("../lib/middleware");
const app = new App();

const answers = new Map();
const messages = new Map();
const challenge = new Map();
const points = new Map();

app
    .use(msg => !msg.author.bot) // ignore bots
    .use(async msg => {
        if(msg.author.id === "694395936809418816" && msg.content === "!reset") {
            answers.clear();
            messages.clear();
            challenge.clear();
            msg.reply("done.");
            return false;
        } else if(msg.author.id === "694395936809418816" && msg.content.startsWith("!start")) {
            var num = msg.content.split(" ")[1][0];
            if(isNaN(parseInt(num))) {
                msg.reply("Invalid type, must start with a number");
                return false;
            }
            challenge.set("num", num);
            msg.reply("challenge type set.");
            return false;
        }
    })
    .use(msg => msg.channel.id === "745989024099074068")
    .use(msg => {
        if(challenge.get("hint")) return;
        if(msg.author.id === "694395936809418816") {
            challenge.set("hint", msg.id);
            return false;
        }
    })
    .use(msg => {
        if(!/^\[[0-9.]+\]/.test(msg.member.displayName)) {
            msg.author.send("You must register first");
            msg.delete();
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
        }
        console.log("New answer:", msg.content, "by", msg.member.displayName);
        messages.set(msg.id, 1);
        msg.react("✅");
        msg.react("❌");
    })

module.exports = { app, answers, messages, challenge, points };