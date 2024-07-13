import type { Component } from 'solid-js';
import { createSignal, onCleanup } from 'solid-js';


import './ResultTable.sass';

function formatTimeWithMilliseconds(milliseconds: number): string | null {

    if (milliseconds == null || milliseconds == Infinity) {
        return '';
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const remainingMilliseconds = milliseconds % 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    const formattedMinutes = minutes.toString().padStart(1, '0');
    const formattedSeconds = remainingSeconds.toString().padStart(minutes > 0 ? 2 : 1, '0');
    const formattedMilliseconds = remainingMilliseconds.toString().padStart(3, '0');

    if (minutes == 0) {
        return `${formattedSeconds}.${formattedMilliseconds}`;
    }

    return `${formattedMinutes}:${formattedSeconds}.${formattedMilliseconds}`;
}

interface Lap {
    number: number;
    time: number | null;
    start: number;
    end: number | null;
  }

// Функция для поиска последнего завершенного круга
function findLastCompletedLap(laps: Lap[]): Lap | null {
    let lastCompletedLap: Lap | null = null;

    const lapKeys = Object.keys(laps);
  for (let i = 0; i < lapKeys.length; i++) {
    const key: string = lapKeys[i];
    const lap = laps[key];

    // Проверяем, что у круга есть время и конечная точка
    if (lap.time !== null && lap.end !== null) {
      // Если текущий круг завершенный и его номер больше последнего найденного
      if (!lastCompletedLap || lap.number > lastCompletedLap.number) {
        lastCompletedLap = lap;
      }
    }
  }

    return lastCompletedLap;
}

function getLapTime(laps: Lap[]): string | null{
    let lap: Lap | null = findLastCompletedLap(laps);

    if (lap != null) {
        return formatTimeWithMilliseconds(lap.time as number);
    }
    
    return '';
}

const ResultTable: Component = (props) => {

    const [columns, setColumns] = createSignal({
        col1: { visible: true, size: '6vw', label: "#", class: 'position' },
        col2: { visible: true, size: '32vw', label: 'Пилот', class: 'driver' },
        col3: { visible: true, size: '5vw', label: 'Кругов', class: 'lap' },
        col5: { visible: true, size: '14vw', label: 'Лучший', class: 'best' },
        col4: { visible: true, size: '14vw', label: "Последний", class: 'last' },
        col6: { visible: true, size: '14vw', label: 'Отставание', class: 'interval' }
    });

    // Функция для получения размеров видимых колонок
    const getTableSizes = () => {
        let sizes = [];
        const columnsValue = columns();
        for (let column of Object.keys(columnsValue)) {
            if (columnsValue[column].visible) {
                sizes.push(columnsValue[column].size);
            }
        }
        return sizes.join(" ");
    };

    const getLapColor = (lastLap: Lap, isBestImproved: boolean, bestOverall: number) => {
        if (lastLap === undefined || lastLap === null) {
            return '';
        }

        if (lastLap.time === bestOverall) {
            return 'purple';
        } else if (isBestImproved) {
            return 'green';
        } else if (lastLap == undefined) {
            return '';
        } else {
            return 'yellow';
        }
    };

    return (
        <div class="table">
            <div class="table-header" style={{ 'grid-template-columns': getTableSizes() }}>
                {Object.keys(columns()).map(columnKey => {
                    const column = columns()[columnKey];
                    return column.visible && <div class={`column ${column.class}`}>{column.label}</div>;
                })}
            </div>
            <div class="table-body">
                <For each={Object.entries(props.raceData)}>
                    {([number, driver], index) => (
                        <div class="row" style={{ 'grid-template-columns': getTableSizes() }}>
                            <div class="column position">{index() + 1}</div><div class="column driver">
                                <div class="number">{driver.id}</div>
                                <div class="name">{driver.name}</div>
                            </div>
                            <div class="column lap">{Object.keys(driver.laps).length > 0 ? Object.keys(driver.laps).length : ''}</div>
                            <div class={`column best ${driver.bestTime === props.bestLap ? 'purple' : ''}`}>{Object.keys(driver.laps).length > 0 ? formatTimeWithMilliseconds(driver.bestTime) : ''}</div>
                            <div class={`column last ${getLapColor(findLastCompletedLap(driver.laps), driver.improved, props.bestLap)}`}>{Object.keys(driver.laps).length > 0 ? getLapTime(driver.laps) : ''}</div>
                            <div class="column interval">
                                {index() === 0 || Object.keys(driver.laps).length <= 0
                                    ? ""
                                    : `+${formatTimeWithMilliseconds(driver.bestTime - props.raceData[0].bestTime)}`}
                            </div>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
};

export default ResultTable;