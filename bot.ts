const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const axios = require("axios");
require("dotenv").config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const formatDate = (date: number) => {
  const dateObject = new Date(date);
  const day = dateObject.getDate();
  const month = dateObject.getMonth() + 1;
  const year = dateObject.getFullYear();
  const hours = dateObject.getHours();
  const minutes = dateObject.getMinutes();
  const seconds = dateObject.getSeconds();

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const chatInfoMessage = (chatId: number) => {
  const runChatInfoMessage = () => {
    // local node 
    const nodeUrl: string = process.env.SWAGGER_API_URL + "/info";
    // github api for version
    const gitUrl: string = "https://api.github.com/repos/ergoplatform/ergo/releases";

    const nodeRequest = axios.get(nodeUrl);
    const gitRequest = axios.get(gitUrl);

    axios.all([nodeRequest, gitRequest]).then(
      axios.spread((...responses) => {
        const nodeResponse = responses[0].data;
        const gitResponse = responses[1].data[0];

        const gitVersion = gitResponse.tag_name.split("v")[1];
        const nodeVersion = nodeResponse.appVersion;

        const daysRunning = Math.floor(
          (new Date().getTime() - nodeResponse.launchTime) / (1000 * 3600 * 24)
        );

        // create table info telegram
const tableInfo = `
<b>
${gitVersion !== nodeVersion ? "Update available" : "No update available"}
Your node is running since ${daysRunning} days.
</b>
<pre>
+---------------+--------------------+
 current time   | ${formatDate(nodeResponse.currentTime)}
 launch time    | ${formatDate(nodeResponse.launchTime)}
+---------------+--------------------+
 git version    | ${gitVersion}      
 node version   | ${nodeVersion}     
+---------------+--------------------+
</pre>
`;
      bot.sendMessage(chatId, tableInfo, { parse_mode: "HTML" });
      }
    )).catch(errors => {
      console.error(errors);
    }
    );
  };

  // cron schedule every day at 12:00
  const dailyCronJob = cron.schedule("0 12 * * *", () => {
    runChatInfoMessage();
  });

  // run once at start
  bot.sendMessage(
    chatId,
    "The Bot has started it will send you a daily info message at 12:00."
  );
  runChatInfoMessage();

  // run daily
  dailyCronJob.start();

  return;
};

bot.on("message", (msg: any) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  bot.sendMessage(chatId, "Start the bot with /start");

  // message match /start trigger
  if (messageText === "/start") {
    chatInfoMessage(chatId);
  }
});
