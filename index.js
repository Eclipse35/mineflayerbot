const mineflayer = require('mineflayer')

const bot = mineflayer.createBot({
    host: '109.236.91.2',
    port:  43001,
    username: 'Bot35',
    version: false,
//    password: process.argv[5],
})

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  bot.chat(message)
})

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)
