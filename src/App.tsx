import { Component, createSignal, onCleanup, onMount } from "solid-js";
import { createMemo } from "solid-js"
import './styles.sass'

import { WebSocketClient } from "./websocket";

import ScoreboardHeader from './scoreboard/ScoreboardHeader';
import ResultTable from './scoreboard/ResultTable';
import Stub from './stub/Stub';

//Состояния гонки
const [webSocketStatus, setWebsocketStatus] = createSignal(false); //Состояние подключения
const [raceStatus, setRaceStatus] = createSignal(false);
const [raceTiming, setRaceTiming] = createSignal({elapsed: null, left: null})

const [stubEnabled, setStubStatus] = createSignal(true);
// Создание сигнала состояния для данных о заезде
const [raceData, setRaceData] = createSignal({});

const [finalScore, setFinalScore] = createSignal([]);
const [bestOverallTime, setBestOverallTime] = createSignal<number>(Infinity);

/// Функция сортировки для квалификации
const qualifySort = (data) => {
  return Object.values(data).sort((a, b) => a.bestTime - b.bestTime);
};

// Функция сортировки для гонки
const raceSort = (data) => {
  return Object.values(data).sort((a, b) => {
    const lapsA = a.laps.reduce((sum, lap) => sum + lap, 0);
    const lapsB = b.laps.reduce((sum, lap) => sum + lap, 0);
    return lapsA - lapsB;
  });
};

// Функция пересчета лучших кругов для всех участников
const recalculateBestLaps = (data) => {
  let updatedData = { ...data };
  return updatedData;
};

// Обновление итогового порядка
const updateFinalScore = () => {
  const sortedData = qualifySort(raceData());
  setFinalScore(sortedData); 
};

// Функция для разбора сообщения
const parseMessage = (message) => {
  return message.split(',').map(part => part.replace(/"/g, ''));
};

function onTiming(message: any) {
  setRaceTiming(payload => {
    return {
      elapsed: message.data.elapsed,
      left: message.data.left
    }
  });
}

function onStatus(message: any) {

  setRaceTiming(payload => {
    return {
      elapsed: message.data.elapsedTime,
      left: message.data.timeLeft
    }
  });

  setRaceStatus(message.data.active);
  setRaceData(message.data.racers);
  setBestOverallTime(message.data.bestLapTime);
  updateFinalScore();

  if (message.data.active) {
    setStubStatus(false);
  }
}

function onConnected() {
  setWebsocketStatus(true);
}

function onClose() {
  setStubStatus(true);
}

function onClear() {
  setRaceData({});
  setBestOverallTime(Infinity);

  updateFinalScore();
}

let stubTimeOut: any = null;


function onFinish() {
  stubTimeOut = setTimeout(() => {
    setStubStatus(true);
  }, 5 * 60 * 1000)
}

function onStart() {
  clearTimeout(stubTimeOut);
  setStubStatus(false);
}

function onEndLap(message: any) {
  setRaceData(data => {

    let updatedData: any = { ...data }

    updatedData[message.data.id].laps[message.data.lapNumber] = {number: message.data.lapNumber, time: message.data.time };
    updatedData[message.data.id].improved = message.data.isImproved;

    if (updatedData[message.data.id].improved || updatedData[message.data.id].bestLap < 1) {
      updatedData[message.data.id].bestTime = message.data.time;
      updatedData[message.data.id].bestLap = message.data.lapNumber;
    }

    if ((bestOverallTime() == null ? Infinity : bestOverallTime()) > message.data.time) {
      setBestOverallTime(message.data.time);
    }

    return updatedData;

  });

  updateFinalScore();
}

function onAddDriver(message: any) {
  setRaceData(data => {

    let updatedData = { ...data };

    updatedData[message.data.id] = {
      "id": message.data.id,
      "name": message.data.name != "" ? message.data.name : "Карт #" + message.data.id,
      "laps": {},
      "bestLap": null,
      "bestTime": Infinity,
      "improved": null
    }

    return updatedData;
  });

  updateFinalScore();
}

const App: Component = () => {

  let ws = new WebSocketClient("ws://192.168.1.71:5000", true);

  onMount(() => {
    ws.start();

    ws.addEventListener("message.status", onStatus)
    ws.addEventListener("open", onConnected)
    ws.addEventListener("message.timing", onTiming)
    ws.addEventListener("message.clear", onClear)
    ws.addEventListener("message.endLap", onEndLap)
    ws.addEventListener("message.addDriver", onAddDriver)
    ws.addEventListener("message.finish", onFinish)
    ws.addEventListener("message.start", onStart)

    ws.addEventListener("close", onClose);
    
    ws.message("getStatus", {});
  });

  onCleanup(() => {

  });

  return (
    <div class="scoreboard">
      <Show when={stubEnabled()}>
        <Stub status={webSocketStatus()} />
      </Show>
      <ScoreboardHeader timing={raceTiming()} />
      <ResultTable raceData={finalScore()} bestLap={bestOverallTime()} />
    </div>
  );
};

export default App;
