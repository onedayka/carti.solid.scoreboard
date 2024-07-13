import { onMount, Show, type Component } from 'solid-js';
import { createSignal } from "solid-js";

import './StubVideo.sass';
import logo from './../assets/logo.svg';
import gradientVideo2 from "./../assets/gradient2.mp4";
import gradientVideo4 from "./../assets/gradient4.mp4";
import gradientVideo7 from "./../assets/gradient7.mp4";

const Stub: Component = (props) => {

    const [videoSrc, setVideoSrc] = createSignal("");

    onMount(() => {
        const videos = [gradientVideo2, gradientVideo4, gradientVideo7];
        const randomVideo = videos[Math.floor(Math.random() * videos.length)];
        
        setVideoSrc(randomVideo);
    });

    return (
        <div class="stub">
            <div class="gradient-video-bg">
                <video src={videoSrc()} autoplay loop muted />
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