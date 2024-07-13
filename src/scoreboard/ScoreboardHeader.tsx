import { onMount, type Component } from 'solid-js';

import './ScoreboardHrader.sass';
import logo from './../assets/logo.svg';

interface ScoreboardHeaderProps {
    timing: {
        elapsed: number;
        left: number;
    }
}

const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const ScoreboardHeader: Component<ScoreboardHeaderProps> = (props) => {

return (
    <div class="scoreboardHead">
        <div class="status">
            <div class="scoreboard-logo">
                <img src={logo} alt="Logo" />
            </div>
        </div>
        <div class="timer">
            <div class="left">
                {formatTime(props.timing.left)}
            </div>
            <div class="elapsed">
                {formatTime(props.timing.elapsed)}
            </div>
        </div>
    </div>
    );
};

export default ScoreboardHeader;