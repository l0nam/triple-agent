import { useState, useEffect } from "react";
import { startGame, assignOperations, executeOperation, endGame } from "../lib/gameLogic";
import Toast from "../components/Toast";

export default function HostPage() {
  const [playerNames, setPlayerNames] = useState(["", "", "", "", ""]);
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState("setup");
  const [votes, setVotes] = useState({});
  const [results, setResults] = useState([]);
  const [arrestedPlayer, setArrestedPlayer] = useState(null);
  const [winningTeam, setWinningTeam] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [votingTimerSeconds, setVotingTimerSeconds] = useState(300);
  const [votingTimeLeft, setVotingTimeLeft] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [currentOperationIndex, setCurrentOperationIndex] = useState(0);
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [operationHistory, setOperationHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const addToast = (message) => {
    setToasts((prev) => [...prev, message]);
  };

  useEffect(() => {
    const savedState = localStorage.getItem("tripleAgentState");
    if (savedState) {
      const { playerNames, players, phase, votes, results, arrestedPlayer, winningTeam, currentOperationIndex, operationHistory, timerSeconds, votingTimerSeconds } = JSON.parse(savedState);
      setPlayerNames(playerNames || ["", "", "", "", ""]);
      setPlayers(players || []);
      setPhase(phase || "setup");
      setVotes(votes || {});
      setResults(results || []);
      setArrestedPlayer(arrestedPlayer || null);
      setWinningTeam(winningTeam || null);
      setCurrentOperationIndex(currentOperationIndex || 0);
      setOperationHistory(operationHistory || []);
      setTimerSeconds(timerSeconds || 60);
      setVotingTimerSeconds(votingTimerSeconds || 300);
    }
  }, []);

  useEffect(() => {
    const state = { playerNames, players, phase, votes, results, arrestedPlayer, winningTeam, currentOperationIndex, operationHistory, timerSeconds, votingTimerSeconds };
    localStorage.setItem("tripleAgentState", JSON.stringify(state));
  }, [playerNames, players, phase, votes, results, arrestedPlayer, winningTeam, currentOperationIndex, operationHistory, timerSeconds, votingTimerSeconds]);

  useEffect(() => {
    if (phase === "operationDiscussion" && timeLeft === null) {
      setTimeLeft(Math.min(timerSeconds, 300));
    }
    if (phase === "operationDiscussion" && timeLeft > 0 && !timerPaused) {
      const timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleNextOperation();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [phase, timeLeft, timerPaused, timerSeconds]);

  useEffect(() => {
    if (phase === "voting" && votingTimeLeft !== null && votingTimeLeft > 0) {
      const timerId = setInterval(() => {
        setVotingTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [phase, votingTimeLeft]);

  const handleNameChange = (index, value) => {
    const newNames = [...playerNames];
    newNames[index] = value;
    setPlayerNames(newNames);
  };

  const addPlayer = () => {
    if (playerNames.length < 9) setPlayerNames([...playerNames, ""]);
  };

  const removePlayer = () => {
    if (playerNames.length > 5) setPlayerNames(playerNames.slice(0, -1));
  };

  const handleStartGame = () => {
    try {
      const filteredNames = playerNames.filter((name) => name.trim() !== "");
      if (filteredNames.length < 5) {
        addToast("Нужно минимум 5 игроков с именами");
        return;
      }
      const newPlayers = startGame(filteredNames);
      setPlayers(newPlayers);
      setVotes(newPlayers.reduce((acc, player) => ({ ...acc, [player.id]: 0 }), {}));
      setPhase("roles");
    } catch (error) {
      addToast(error.message);
    }
  };

  const handleStartOperations = () => {
    setCurrentOperationIndex(0);
    const updatedPlayers = assignOperations([...players]);
    setPlayers(updatedPlayers);
    setPhase("operations");
  };

  const handleExecuteOperation = () => {
    const currentPlayer = players[currentOperationIndex];
    if (currentPlayer.requiresTargets > 0 && selectedTargets.length !== currentPlayer.requiresTargets) {
      addToast(`Выберите ${currentPlayer.requiresTargets} агента(ов)`);
      return;
    }
    const updatedPlayers = [...players];
    updatedPlayers[currentOperationIndex] = executeOperation(
      currentPlayer,
      players,
      selectedTargets.map((id) => players.find((p) => p.id === id))
    );
    setPlayers(updatedPlayers);
    setOperationHistory((prev) => [
      ...prev,
      `${currentOperationIndex + 1}: ${currentPlayer.name} — ${currentPlayer.operationResult.split('\n')[0]}`,
    ]);
    navigator.clipboard.writeText(currentPlayer.operationResult).then(() => {
      addToast(`Текст операции для ${currentPlayer.name} скопирован!`);
    });
    setSelectedTargets([]);
    setPhase("operationDiscussion");
  };

  const handleNextOperation = () => {
    if (currentOperationIndex + 1 < players.length) {
      setCurrentOperationIndex(currentOperationIndex + 1);
      setPhase("operations");
      setTimeLeft(null);
      setTimerPaused(false);
    } else {
      setPhase("voting");
      setVotingTimeLeft(votingTimerSeconds);
    }
  };

  const handleEndGame = () => {
    const maxVotes = Math.max(...Object.values(votes));
    const candidates = players.filter((player) => votes[player.id] === maxVotes);
    const arrestedPlayer = candidates.length > 1 ? candidates[Math.floor(Math.random() * candidates.length)] : candidates[0];
    const gameResults = endGame(players, arrestedPlayer.id);

    let winningEntity;
    // Проверяем индивидуальную победу
    const individualWinner = gameResults.find((result) => result.victoryCondition && result.won);
    if (individualWinner) {
      // Если есть индивидуальный победитель, он побеждает один
      winningEntity = individualWinner.name;
      setResults(gameResults.map((result) => ({
        ...result,
        won: result.name === individualWinner.name, // Все остальные проигрывают
      })));
    } else {
      // Иначе определяем победившую организацию
      const arrestedIsVirus = arrestedPlayer.role === "VIRUS" && !arrestedPlayer.victoryCondition?.type;
      winningEntity = arrestedIsVirus ? "Секретная организация" : "VIRUS";
      setResults(gameResults);
    }

    setArrestedPlayer(arrestedPlayer);
    setWinningTeam(winningEntity);
    setPhase("results");
  };

  const resetGame = () => {
    setPlayers([]);
    setPhase("setup");
    setVotes({});
    setResults([]);
    setArrestedPlayer(null);
    setWinningTeam(null);
    setTimeLeft(null);
    setVotingTimeLeft(null);
    setTimerPaused(false);
    setCurrentOperationIndex(0);
    setSelectedTargets([]);
    setOperationHistory([]);
    setTimerSeconds(60);
    setVotingTimerSeconds(300);
    localStorage.setItem("tripleAgentState", JSON.stringify({
      playerNames,
      players: [],
      phase: "setup",
      votes: {},
      results: [],
      arrestedPlayer: null,
      winningTeam: null,
      currentOperationIndex: 0,
      operationHistory: [],
      timerSeconds: 60,
      votingTimerSeconds: 300
    }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" + secs : secs}`;
  };

  const getRoleDisplayName = (role, player) => {
    if (player?.victoryCondition?.type === "switch") {
      return role === "Service" ? "VIRUS" : "Секретная организация";
    }
    return role === "Service" ? "Секретная организация" : "VIRUS";
  };

  const getRoleDescription = (player) => {
    const roleName = getRoleDisplayName(player.role);
    const goal =
      player.role === "Service"
        ? "Вычислить и арестовать хотя бы одного агента VIRUS."
        : "Скрыть свою роль и не дать себя арестовать.";
    const accomplices =
      player.accomplices.length > 0 ? `\nСообщники: ${player.accomplices.join(", ")}` : "";
    return `${player.name}\nРоль: ${roleName}\nЦель: ${goal}${accomplices}`;
  };

  const copyRoleToClipboard = (player) => {
    navigator.clipboard.writeText(getRoleDescription(player)).then(() => {
      addToast(`Роль ${player.name} скопирована в буфер обмена!`);
    });
  };

  const toggleTargetSelection = (playerId) => {
    const currentPlayer = players[currentOperationIndex];
    if (selectedTargets.includes(playerId)) {
      setSelectedTargets(selectedTargets.filter((id) => id !== playerId));
    } else if (selectedTargets.length < currentPlayer.requiresTargets) {
      setSelectedTargets([...selectedTargets, playerId]);
    }
  };

  const copyOperationDescription = (player) => {
    navigator.clipboard.writeText(player.operationDescription).then(() => {
      addToast(`Описание операции для ${player.name} скопировано!`);
    });
  };

  const toggleTimerPause = () => {
    setTimerPaused((prev) => !prev);
  };

  const adjustTimer = (delta) => {
    setTimerSeconds((prev) => Math.max(30, Math.min(300, prev + delta)));
  };

  const adjustVotingTimer = (delta) => {
    setVotingTimerSeconds((prev) => Math.max(30, Math.min(600, prev + delta)));
  };

  const restartVotingTimer = () => {
    setVotingTimeLeft(votingTimerSeconds);
  };

  const adjustVotes = (playerId, delta) => {
    setVotes((prev) => ({
      ...prev,
      [playerId]: Math.max(0, (prev[playerId] || 0) + delta),
    }));
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white p-6 flex items-center justify-center relative">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6">Тройной агент</h1>

        {phase === "setup" && (
          <div>
            <h2 className="mb-3 text-center">Имена игроков</h2>
            {playerNames.map((name, index) => (
              <input
                key={index}
                type="text"
                value={name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                placeholder={`Игрок ${index + 1}`}
                className="input mb-2"
              />
            ))}
            <div className="flex gap-1.5 mb-2">
              <button
                onClick={addPlayer}
                disabled={playerNames.length >= 9}
                className={`btn w-full btn-success ${playerNames.length >= 9 ? "btn-disabled" : ""}`}
              >
                Добавить
              </button>
              <button
                onClick={removePlayer}
                disabled={playerNames.length <= 5}
                className={`btn w-full btn-danger ${playerNames.length <= 5 ? "btn-disabled" : ""}`}
              >
                Убрать
              </button>
            </div>
            <button onClick={handleStartGame} className="btn btn-primary w-full">
              Начать игру
            </button>
          </div>
        )}

        {phase === "roles" && (
          <div>
            <h2 className="mb-3 text-center">Роли игроков</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`role-card ${
                    player.role === "VIRUS" ? "role-card-virus" : "role-card-service"
                  }`}
                  onClick={() => copyRoleToClipboard(player)}
                >
                  <div className="role-name">{player.name}</div>
                  <div>
                    <div className="role-title">{getRoleDisplayName(player.role)}</div>
                    {player.accomplices.length > 0 && (
                      <div className="role-accomplices">{player.accomplices.join(", ")}</div>
                    )}
                  </div>
                  <div></div>
                </div>
              ))}
            </div>
            <button onClick={handleStartOperations} className="btn btn-primary mt-6 w-full">
              Запустить операции
            </button>
          </div>
        )}

        {phase === "operations" && (
          <div>
            <h2 className="mb-3 text-center">Операция {currentOperationIndex + 1}/{players.length}</h2>
            <p className="text-2xl text-center font-medium">{players[currentOperationIndex].name}</p>
            <p className="mb-3 text-center text-white/[50%] text-xl">
              {players[currentOperationIndex].operation || "Нет операции"}
            </p>
            <p
              className="mb-3 card-left card-gray"
              onClick={() => copyOperationDescription(players[currentOperationIndex])}
            >
              {players[currentOperationIndex].operationDescription || "Описание операции недоступно"}
            </p>
            {players[currentOperationIndex].requiresTargets > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-center">
                  Выберите {players[currentOperationIndex].requiresTargets} агента(ов):
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {players
                    .filter((p) => p.id !== players[currentOperationIndex].id)
                    .map((player) => (
                      <div
                        key={player.id}
                        className={`card ${
                          selectedTargets.includes(player.id) ? "card-primary" : "card-gray"
                        }`}
                        onClick={() => toggleTargetSelection(player.id)}
                      >
                        {player.name}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "operationDiscussion" && (
          <div>
            <h2 className="text-center mb-3">Обсуждение операции {currentOperationIndex + 1}</h2>
            <p className="text-2xl text-center font-medium">{players[currentOperationIndex].name}</p>
            <p className="mb-3 text-center text-white/[50%] text-xl">
              {players[currentOperationIndex].operation || "Нет операции"}
            </p>
            <div className="card-left card-gray select-all">{players[currentOperationIndex].operationResult}</div>
          </div>
        )}

        {phase === "voting" && (
          <div>
            <h2 className="title text-center mb-4">Голосование: кого арестовать?</h2>
            <div>
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between mb-2 bg-white/[3%] border-1 border-white/[5%] px-5 py-3 rounded-[20px]">
                  <span className="text-lg">{player.name}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => adjustVotes(player.id, -1)}
                      className="btn btn-secondary flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="text-xl w-8 text-center">{votes[player.id] || 0}</span>
                    <button
                      onClick={() => adjustVotes(player.id, 1)}
                      className="btn btn-secondary flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-4 bg-white/[3%] border-1 border-white/[5%] px-5 py-3 rounded-[20px]">
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-white/[50%]">Таймер:</span>
                <span className="text-xl font-mono">
                  {votingTimeLeft !== null ? formatTime(votingTimeLeft) : formatTime(votingTimerSeconds)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustVotingTimer(-30)}
                  className="btn btn-secondary flex items-center justify-center"
                >
                  −
                </button>
                <button
                  onClick={() => adjustVotingTimer(30)}
                  className="btn btn-secondary flex items-center justify-center"
                >
                  +
                </button>
                <button
                  onClick={restartVotingTimer}
                  className="btn btn-sm btn-secondary"
                >
                  Перезапустить
                </button>
              </div>
            </div>
            <button onClick={handleEndGame} className="btn btn-primary w-full">
              Завершить голосование
            </button>
          </div>
        )}

        {phase === "results" && (
          <div>
            <h2 className="text-center title">Результаты игры</h2>
            <p className="text-center text-white/[50%] mb-4">
              Арестован: {arrestedPlayer?.name} | Победа: {winningTeam}
            </p>
            <div className="mb-4">
              <h3 className="mb-2 text-center">Победители</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {results
                  .filter((result) => result.won)
                  .map((result, index) => (
                    <div key={index} className="card card-primary">
                      <div className="font-bold">{result.name}</div>
                      <div>{getRoleDisplayName(result.role, players.find((p) => p.name === result.name))}</div>
                    </div>
                  ))}
              </div>
            </div>
            <hr className="border-white/[5%] border-1 mb-4" />
            <div className="mb-4">
              <h3 className="mb-2 text-center">Проигравшие</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {results
                  .filter((result) => !result.won)
                  .map((result, index) => (
                    <div key={index} className="card card-gray">
                      <div className="font-bold">{result.name}</div>
                      <div>{getRoleDisplayName(result.role, players.find((p) => p.name === result.name))}</div>
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={resetGame} className="btn btn-primary w-full">
                Новая игра
              </button>
              <button onClick={() => setShowHistoryModal(true)} className="btn btn-secondary w-full">
                История операций
              </button>
            </div>
            {showHistoryModal && (
              <div
                className="fixed inset-0 bg-stone-950/[50%] flex items-center justify-center transition-opacity duration-500 ease-in-out"
              >
                <div
                  className={`bg-stone-900 p-7 rounded-[20px] max-w-md w-full transition-all duration-500 ease-in-out ${
                    showHistoryModal ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
                  }`}
                >
                  <h3 className="text-2xl font-bold mb-4">История операций</h3>
                  <ul className="space-y-2">
                    {operationHistory.map((entry, index) => (
                      <li key={index} className="text-white/[75%]">{entry}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="btn btn-primary mt-4 w-full"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <Toast toasts={toasts} setToasts={setToasts} />
      </div>

      {(phase === "operations" || phase === "operationDiscussion") && (
        <div className="absolute bottom-5 left-0 right-0 mx-6 bg-white/[3%] px-6 py-4 flex justify-between items-center rounded-[20px] border-1 border-white/[5%] max-w-2xl md:mx-auto">
          <div className="flex items-center gap-4">
            <p className="text-sm text-white/[50%]">Таймер:</p>
            <div className="flex items-center gap-2">
              {phase === "operations" && (
                <button
                  onClick={() => adjustTimer(-30)}
                  className="btn btn-secondary flex items-center justify-center"
                >
                  −
                </button>
              )}
              <p className="text-2xl font-mono w-16 text-center">
                {phase === "operationDiscussion" ? formatTime(timeLeft) : formatTime(timerSeconds)}
              </p>
              {phase === "operations" && (
                <button
                  onClick={() => adjustTimer(30)}
                  className="btn btn-secondary flex items-center justify-center"
                >
                  +
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {phase === "operationDiscussion" && (
              <button onClick={toggleTimerPause} className="btn btn-secondary">
                {timerPaused ? "Возобновить" : "Пауза"}
              </button>
            )}
            {phase === "operations" && (
              <button onClick={handleExecuteOperation} className="btn btn-primary">
                Выполнить операцию
              </button>
            )}
            {phase === "operationDiscussion" && (
              <button onClick={handleNextOperation} className="btn btn-primary">
                Следующая операция
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}