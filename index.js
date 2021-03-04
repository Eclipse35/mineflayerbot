const mineflayer = require('mineflayer')
const { pathfinder, goals, Movements } = require('mineflayer-pathfinder')
const { TaskQueue } = require('mineflayer-utils')
const armorManager = require('mineflayer-armor-manager')
const autoeat = require("mineflayer-auto-eat")


const bot = mineflayer.createBot({
    host: 'inmc.tk',
    port:  25565,
    username: 'Bot35',
    version: false,
//    password: process.argv[5],
})

bot.loadPlugin(pathfinder)
bot.loadPlugin(autoeat)
bot.loadPlugin(armorManager)

const VIEW_RANGE = 16
const FOLLOW_RANGE = 2
const ATTACK_RANGE = 3.75

let fighting = false
let target = null
let guardMode = false
let gaurdPos = null

bot.once('spawn', () => {
  bot.chat('hi!')
})
{
    const mcData = require('minecraft-data')
    (bot.version)
    const movements = new Movements(bot, mcData)
    
    bot.pathfinder.setMovements(movements)
        bot.autoEat.options = {
          priority: "saturation",
          startAt: 16,
          bannedFood: [],
        }
      })
    // The bot eats food automatically and emits these events when it starts eating and stops eating.
    bot.on("autoeat_started", () => {
      console.log("Auto Eat started!")
    })
    bot.on("autoeat_stopped", () => {
      console.log("Auto Eat stopped!")
    })
     
    bot.on("health", () => {
      if (bot.food === 20) bot.autoEat.disable()
      // Disable the plugin if the bot is at 20 food points
      else bot.autoEat.enable() // Else enable the plugin again
    })
function guardArea (pos) {
    guardMode = true
    gaurdPos = pos
}

function stopGuarding () {
    guardMode = false
}

bot.on('physicTick', () => {
    if (!guardMode) return

    const entity = getNearestTarget(false)
    if (entity && entity.position.distanceTo(bot.entity.position) < VIEW_RANGE) {
        startFighting(entity)
        return
    }

    if (fighting) return
    if (bot.pathfinder.isMoving()) return
    
    if (bot.entity.position.distanceTo(gaurdPos) > 1) {
        bot.pathfinder.setGoal(new goals.GoalBlock(gaurdPos.x, gaurdPos.y, gaurdPos.z))
    }
})

bot.on('physicTick', () => {
    if (!guardMode) return
    if (!fighting) return

    if (target.position.distanceTo(bot.entity.position) > VIEW_RANGE)
        stopFighting()
})

function startFighting (entity) {
    if (fighting && target === entity) return

    fighting = true
    target = entity

    bot.pathfinder.setGoal(new goals.GoalFollow(target, FOLLOW_RANGE), true)
    chargeAttack()
}

function stopFighting () {
    fighting = false
    target = null

    bot.pathfinder.setGoal(null)
}

function getNearestTarget (players) {
    const filter = e => {
        if (e.position.distanceTo(bot.entity.position) > VIEW_RANGE) return false
        if (e.type !== 'player' && e.type !== 'mob') return false
        if (e.type === 'player' && !players) return false
        if (e.type === 'mob' && e.mobType === 'Armor Stand') return false

        return true
    }
    return bot.nearestEntity(filter)
}

bot.on('chat', (username, message) => {
    if (username === bot.username) return
    
    if (message === 'go') {
        const entity = getNearestTarget(true)

        if (!entity) {
            bot.chat("I don't see any targets nearby.")
            return
        }

        startFighting(entity)
    }

    if (message === 'guard') {
        const player = bot.players[username]

        if (!player) {
            bot.chat("I can't see you.")
            return
        }

        guardArea(player.entity.position)
    }
    if (message === 'stop') { 
        stopFighting()
        stopGuarding()
    }
})

bot.on('physicTick', () => {
    if (bot.pathfinder.isMoving()) return
    if (fighting) return

    const entity = bot.nearestEntity()
    if (entity)
        bot.lookAt(entity.position.offset(0, entity.height, 0))
})

bot.on('playerCollect', (collector, itemDrop) => {
    if (collector !== bot.entity) return

    setTimeout(() => {
        const queue = new TaskQueue()
    
        const sword = bot.inventory.items().find(item => item.name.includes('sword'))
        if (sword) {
            queue.add(cb => bot.equip(sword, 'hand', cb))
            queue.add(cb => setTimeout(cb, 100))
        }

        const shield = bot.inventory.items().find(item => item.name.includes('shield'))
        if (shield) {
            queue.add(cb => bot.equip(shield, 'off-hand', cb))
            queue.add(cb => setTimeout(cb, 100))
        }
    
        queue.runAll()
    }, 150)
})

bot.on('entityGone', (entity) => {
    if (entity === target) {
        stopFighting()

        if (!guardMode) {
            setTimeout(() => {
                bot.chat('I won.')
            }, 1000)
        }
    }
})

bot.on('death', () => {
    stopFighting()

    if (!guardMode) {
        setTimeout(() => {
            bot.chat('I lost...')
        }, 1000)
    }
})

let timeUntilNextAttack = 0
bot.on('physicTick', () => {
    if (!fighting) return

    timeUntilNextAttack--
    if (timeUntilNextAttack > 0) return

    timeUntilNextAttack = Math.random() * 10 + 10
})

function hasShield () {
    if (bot.supportFeature('doesntHaveOffHandSlot')) return false

    const slot = bot.inventory.slots[bot.getEquipmentDestSlot('off-hand')]
    if (!slot) return false

    return slot.name.includes('shield')
}

function chargeAttack () {
    if (hasShield() && bot.entity.position.distanceTo(target.position) < ATTACK_RANGE)
        bot.activateItem(true) // Raise shield

    const time = Math.random() * 500 + 500
    setTimeout(tryAttack, time)
}

function tryAttack () {
    if (!fighting) return

    if (target && bot.entity.position.distanceTo(target.position) < ATTACK_RANGE) {
        const queue = new TaskQueue()

        if (hasShield()) {
            queue.addSync(bot.deactivateItem()) // Lower shield
            queue.add(cb => setTimeout(cb, 100))
        }
            
        queue.add(cb => bot.lookAt(target.position.offset(0, target.height, 0), true, cb))
        queue.addSync(bot.attack(target, true))
        queue.add(cb => setTimeout(cb, 150))

        queue.runAll(chargeAttack)
    }
    else
        chargeAttack()
}
