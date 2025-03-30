// Функция для перемешивания массива
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Старт игры: генерация ролей и сообщников
function startGame(playerNames) {
  const playerCount = playerNames.length;
  if (playerCount < 5 || playerCount > 9) {
    throw new Error("Количество игроков должно быть от 5 до 9");
  }

  let virusCount;
  switch (playerCount) {
    case 5:
      virusCount = 2;
      break;
    case 6:
      virusCount = 2;
      break;
    case 7:
      virusCount = 3;
      break;
    case 8:
      virusCount = 3;
      break;
    case 9:
      virusCount = 4;
      break;
  }

  const roles = Array(playerCount).fill("Service");
  for (let i = 0; i < virusCount; i++) roles[i] = "VIRUS";
  shuffle(roles);

  const players = playerNames.map((name, i) => ({
    id: i,
    name,
    role: roles[i],
    accomplices: roles[i] === "VIRUS" ? playerNames.filter((_, j) => roles[j] === "VIRUS" && j !== i) : [],
    operation: null,
    operationResult: null,
    victoryCondition: null,
  }));

  return players;
}

// Выбор случайного игрока, кроме себя
function randomPlayer(players, excludePlayer) {
  const others = players.filter((p) => p.id !== excludePlayer.id);
  return others[Math.floor(Math.random() * others.length)];
}

// Выбор двух игроков из одной организации
function getSameTeamPlayers(players) {
  const virusPlayers = players.filter((p) => p.role === "VIRUS");
  const servicePlayers = players.filter((p) => p.role === "Service");
  const team = Math.random() < 0.5 && virusPlayers.length >= 2 ? virusPlayers : servicePlayers;
  shuffle(team);
  return team.slice(0, 2);
}

// Выбор двух случайных игроков с разными ролями
function getDifferentTeamPlayers(players) {
  const virusPlayers = players.filter((p) => p.role === "VIRUS");
  const servicePlayers = players.filter((p) => p.role === "Service");
  shuffle(virusPlayers);
  shuffle(servicePlayers);
  return Math.random() < 0.5
    ? [virusPlayers[0], servicePlayers[0]]
    : [servicePlayers[0], virusPlayers[0]];
}

// Доступные операции
const operations = [
  {
    name: "Неприязнь",
    requiresTargets: 0,
    description: (player) => `Неприязнь. У тебя будет неприязнь к случайному игроку. Ты победишь, если его арестуют.`,
    execute: (player, players) => {
      const target = randomPlayer(players, player);
      player.victoryCondition = { type: "dislike", target };
      return `Недавно ${target.name} пролил на тебя горячий кофе. С того моменда у тебя жуткая неприязнь к нему. Ты победишь, если он будет арестован.\n\n` +
      `Совет: Скажи всем, что тебе доложили о принадлежности игрока ${target.name} к организации VIRUS.`;
    },
  },
  {
    name: "Одержимость",
    requiresTargets: 0,
    description: (player) => `Одержимость. У тебя будет одержимость случайным игроком. Ты победишь, если он победит.`,
    execute: (player, players) => {
      const target = randomPlayer(players, player);
      player.victoryCondition = { type: "obsession", target };
      return `Ты одержим игроком ${target.name}. Это буквально любовь с первого взгляда. Ты победишь, если игрок ${target.name} выиграет и проиграешь если этого не произойдет.\n`+
      `Совет: Скажи, что тебе сообщили о выдающихся заслугах игрока ${target.name} во славу Секретной организации.`;
    },
  },
  {
    name: "Признание",
    requiresTargets: 1,
    description: (player) => `Ты признаешься выбранному игроку, на какую организацию работаешь. Кому хочешь признаться?`,
    execute: (player, players, targets) => {
      const roleName = player.role === "Service" ? "Секретная организация" : "VIRUS";
      return `На днях вы встретились с игроком ${player.name} наедине. Он признался тебе, что работает на ${roleName}. Используй эту информацию как сам посчитаешь нужным.`;
    },
  },
  {
    name: "Секретные данные",
    requiresTargets: 2,
    description: (player) => `Ты узнаешь, есть ли VIRUS среди двух выбранных тобой игроков. Кого хочешь выбрать для проверки?`,
    execute: (player, players, targets) => {
      const hasVirus = targets[0].role === "VIRUS" || targets[1].role === "VIRUS";
      return `Ты получил письмо. В нем написано о двух твоих коллегах: ${targets[0].name} и ${targets[1].name}. В письме написано "${hasVirus ? "Кто-то из них - придатель" : "Они оба чисты"}".`;
    },
  },
  {
    name: "Козёл отпущения",
    requiresTargets: 0,
    description: (player) => `Козёл отпущения. Ты победишь, если тебя арестуют.`,
    execute: (player) => {
      player.victoryCondition = { type: "scapegoat" };
      return `Ты победишь, если тебя арестуют.\n\n` +
      `Совет: Скажи, что раньше работал на VIRUS, но теперь чист, чтобы вызвать подозрения.`;
    },
  },
  {
    name: "Агент внедрения",
    requiresTargets: 0,
    description: (player) => `Агент внедрения. Ты переходишь в противоположную организацию.`,
    execute: (player) => {
      player.victoryCondition = { type: "switch" };
      const newRole = player.role === "Service" ? "VIRUS" : "Секретная организация";
      return `Теперь ты работаешь на ${newRole}.\n\n` +
      `Совет: Соври, что тебе сообщили информацию, которая будет полезна тебе в новой организации. Например, что кто-то предатель.`;
    },
  },
  {
    name: "Секретный звонок",
    requiresTargets: 0,
    description: (player) => `Секретный звонок. Ты узнаешь роль случайного игрока.`,
    execute: (player, players) => {
      const target = randomPlayer(players, player);
      const roleName = target.role === "Service" ? "Секретная организация" : "VIRUS";
      return `Тебе только что поступил звонок от незнакомца. Всё, что он сказал: ${target.name} работает на ${roleName}.`;
    },
  },
  {
    name: "Старые фотографии",
    requiresTargets: 0,
    description: (player) => `Старые фотографии. Ты узнаешь, что два случайных игрока работали на одну организацию в начале игры.`,
    execute: (player, players) => {
      const sameTeam = getSameTeamPlayers(players);
      return `Роясь в архиве, ты нашёл альбом со старыми фотографиями. На одно из них изображены твои коллеги: ${sameTeam[0].name} и ${sameTeam[1].name}. Они оба работали в одной организации в своё время. Славные были времена. Интересно, изменилось ли что-то?`;
    },
  },
  {
    name: "Датская разведка",
    requiresTargets: 0,
    description: (player) => `Ты перехватил сообщение о двух игроках: один — VIRUS, другой — нет.`,
    execute: (player, players) => {
      const [player1, player2] = getDifferentTeamPlayers(players);
      return `Сидя за своим рабочим местом ты перехватил зашифрованное сообщение. В нем говориться о ${player1.name} и ${player2.name}. Ты не смог расшифровать сообщение полностью, но понял, что кто-то из них работает на VIRUS, а другой — нет.`;
    },
  },
  {
    name: "Анонимная наводка",
    requiresTargets: 1,
    description: (player) => `Ты узнаешь, на какую организацию работает выбранный тобой игрок. Кого ты хочешь выбрать?`,
    execute: (player, players, targets) => {
      const roleName = targets[0].role === "Service" ? "Секретная организация" : "VIRUS";
      return `Ты получил наводку: ${targets[0].name} работает на ${roleName}.`;
    },
  },
];

// Назначение операций в случайном порядке
function assignOperations(players) {
  const availableOperations = [...operations];
  shuffle(availableOperations);

  const shuffledPlayers = [...players];
  shuffle(shuffledPlayers);

  return shuffledPlayers.map((player, index) => {
    if (index < availableOperations.length) {
      player.operation = availableOperations[index].name;
      player.requiresTargets = availableOperations[index].requiresTargets;
      player.operationDescription = availableOperations[index].description(player);
    }
    return player;
  });
}

// Выполнение операции с выбранными целями
function executeOperation(player, players, targets) {
  const operation = operations.find((op) => op.name === player.operation);
  if (operation) {
    player.operationResult = operation.execute(player, players, targets);
  }
  return player;
}

// Завершение игры: определение победителей
function endGame(players, votedPlayerId) {
  const votedPlayer = players.find((p) => p.id === votedPlayerId);
  const results = players.map((player) => {
    let won = false;
    if (!player.victoryCondition) {
      if (player.role === "Service" && votedPlayer && votedPlayer.role === "VIRUS") won = true;
      if (player.role === "VIRUS" && votedPlayer && votedPlayer.role !== "VIRUS") won = true;
    } else {
      switch (player.victoryCondition.type) {
        case "dislike":
          won = player.victoryCondition.target && player.victoryCondition.target.id === votedPlayerId;
          break;
        case "obsession":
          won =
            player.victoryCondition.target &&
            ((player.victoryCondition.target.role === "Service" && votedPlayer && votedPlayer.role === "VIRUS") ||
              (player.victoryCondition.target.role === "VIRUS" && votedPlayer && votedPlayer.role !== "VIRUS"));
          break;
        case "scapegoat":
          won = player.id === votedPlayerId;
          break;
        case "switch":
          const newRole = player.role === "Service" ? "VIRUS" : "Service";
          won = newRole === "Service" ? votedPlayer && votedPlayer.role === "VIRUS" : votedPlayer && votedPlayer.role !== "VIRUS";
          break;
      }
    }
    return { name: player.name, role: player.role, won };
  });
  return results;
}

module.exports = { startGame, assignOperations, executeOperation, endGame };