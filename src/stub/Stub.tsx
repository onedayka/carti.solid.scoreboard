import { Show, type Component } from 'solid-js';

import './Stub.sass';
import logo from './../assets/logo.svg';

const Stub: Component = (props) => {

    return (
        <div class="stub">
            <div class="gradient-bg">
                <svg xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="goo">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
                            <feBlend in="SourceGraphic" in2="goo" />
                        </filter>
                    </defs>
                </svg>
                <div class="gradients-container">
                    <div class="g1"></div>
                    <div class="g2"></div>
                    <div class="g3"></div>
                    <div class="g4"></div>
                    <div class="g5"></div>
                </div>
            </div>
            <div class="logo">
                <img src={logo} alt="Logo" />
                <Show when={props.status === false} >
                    <div class="status">Подключение</div>
                </Show>
                <Show when={props.status === true} >
                    <div class="status">Ожидание заезда</div>
                </Show>
            </div>
        </div>
    );
};

export default Stub;