const tmi = require("tmi.js");
OAUTH_TOKEN = "oauth:sdrd5r4n5ms5i2v2rbqamrjug20p0x";
BOT_USERNAME = "pudgehookbot";
CHANNEL_NAME = "adima511";

// Define configuration options
const opts = {
  options: {
    debug: true
  },
  connection: {
    cluster: "aws",
    reconnect: true
  },
  identity: {
    username: BOT_USERNAME,
    password: OAUTH_TOKEN
  },
  channels: [CHANNEL_NAME]
};

var client = new tmi.client(opts);
client.connect();

const rp = require("request-promise");

function getChatters(channelName, _attemptCount = 0) {
  return rp({
    uri: `https://tmi.twitch.tv/group/user/${channelName}/chatters`,
    json: true
  })
    .then(data => {
      return Object.entries(data.chatters).reduce(
        (p, [type, list]) =>
          p.concat(
            list.map(name => {
              if (name === channelName) type = "broadcaster";
              return { name, type };
            })
          ),
        []
      );
    })
    .catch(err => {
      if (_attemptCount < 3) {
        return getChatters(channelName, _attemptCount + 1);
      }
      throw err;
    });
}

function getRandomChatter(channelName, opts = {}) {
  let { onlyViewers = false, noBroadcaster = false, skipList = [] } = opts;
  return getChatters(channelName).then(data => {
    let chatters = data.filter(
      ({ name, type }) =>
        !(
          (onlyViewers && type !== "viewers") ||
          (noBroadcaster && type === "broadcaster") ||
          skipList.includes(name)
        )
    );
    return chatters.length === 0
      ? null
      : chatters[Math.floor(Math.random() * chatters.length)];
  });
}
client.on("chat", (channel, userstate, message, fromSelf) => {
  if (fromSelf || message[0] !== "!") return false;
  let chan = channel.slice(1);
  let params = message.split(" ");
  let command = params
    .shift()
    .slice(1)
    .toLowerCase();
  let dest = params[0];
  if (command === "хук") {
    // Get a random user but skip the user requesting a random user
    if (dest !== undefined) {
      client.say(
        chan,
        `${userstate.username} кинул хук в чат и попал в ${dest}`
      );
    } else {
      getRandomChatter(chan, /*opts = {skipList = [""] }*/)
        .then(user => {
          if (user === null) {
            client.say(
              chan,
              `${userstate.username}, there was no one to choose.`
            );
          } else {
            let { name, type } = user;
            client.say(
              chan,
              `${userstate.username} кинул хук в чат и попал в ${name}`
            );
          }
        })
        .catch(err => console.log("[ERR]", err));
    }
  }
});