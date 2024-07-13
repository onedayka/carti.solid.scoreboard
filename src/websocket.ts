type QueuedMessage = {
    token: string;
    command: string;
    data: any;
};

type Callback = (event: Event) => void;

interface CallbackNode {
    callbacks?: Callback[];

    [key: string]: CallbackNode | Callback[] | undefined;
}

class WebSocketClient {
    private socket: WebSocket;
    private customCallbacks: CallbackNode = {};
    private messageQueue: QueuedMessage[] = [];
    private reconnectionAttempts: number = 0;
    private isReconnecting: boolean = false;
    private isOpen: boolean = false;

    /**
     * Конструктор класса WebSocketHandler.
     * @param url - URL WebSocket сервера.
     * @param debug - Флаг для включения/отключения отладочных сообщений (по умолчанию false).
     * @param keepAlive - Флаг для включения/отключения поддержки keep-alive (по умолчанию true).
     * @param pageId - Уникальный идентификатор страницы на которой развернут плагин.
     * @param maxReconnectionAttempts - Максимальное количество попыток переподключения (по умолчанию 5).
     * @param reconnectionInterval - Интервал для повторного подключения в миллисекундах (по умолчанию 1000 мс).
     * @param sendingInterval - Интервал, который выдерживается перед отправкой следующего сообщения в очереди (по умолчанию 100 мс).
     */
    constructor(
        private url: string,
        private debug: boolean = false,
        private keepAlive: boolean = true,
        private pageId: string | null = null,
        private maxReconnectionAttempts: number = 5,
        private reconnectionInterval: number = 5000,
        private sendingInterval: number = 100,
    ) {
        this.customCallbacks = {};
    }

    /**
     * Метод для установки флага isOpen
     */
    private setSocketOpen(isOpen: boolean) {
        if (this.debug) {
            console.log('[WebSocket] set connection status to: ' + (isOpen ? 'OPEN' : 'CLOSE'));
        }

        this.isOpen = isOpen;
    }

    /**
    /* Метод для получения значения флага isOpen
     */
    private isSocketOpen(): boolean {
        return this.isOpen;
    }

    /**
     * Добавляет обработчик события для указанного типа события.
     * @param eventType - Тип события в формате строки, разделенной точкой.
     * @param callback - Функция-обработчик события.
     */
    public addEventListener(eventType: string, callback: Callback): void {
        const eventParts = eventType.split('.');
        let target = this.customCallbacks;

        eventParts.forEach((part, index) => {
            if (!target[part]) {
                target[part] = {};
            }

            if (index === eventParts.length - 1) {
                const callbacks = (target[part] as CallbackNode).callbacks;

                if (!callbacks) {
                    (target[part] as CallbackNode).callbacks = [callback];
                } else {
                    callbacks.push(callback);
                }

                if (this.debug) {
                    console.log('[WebSocket] new event listener registered: ' + eventType);
                }
            } else {
                target = target[part] as CallbackNode;
            }
        });
    }

    /**
     * Удаляет обработчик события для указанного типа события.
     * @param eventType - Тип события в формате строки, разделенной точкой.
     * @param callback - Функция-обработчик события.
     */
    public removeEventListener(eventType: string, callback: Callback): void {
        const eventParts = eventType.split('.');
        let target = this.customCallbacks;
        let callbacks = null;

        eventParts.forEach((part, index) => {
            if (!target[part]) {
                return;
            }
            if (index === eventParts.length - 1) {
                callbacks = (target[part] as CallbackNode)["callbacks"];
            } else {
                target = target[part] as CallbackNode;
            }
        });

        if (callbacks) {
            const index = (callbacks as Callback[]).indexOf(callback);
            if (index !== -1) {
                (callbacks as Callback[]).splice(index, 1);

                if (this.debug) {
                    console.log('[WebSocket] event listener was removed: ' + eventType);
                }
            }
        }
    }

    /**
     * Очищает все обработчики событий.
     */
    public clearEventListeners(): void {
        this.customCallbacks = {};

        if (this.debug) {
            console.log('[WebSocket] all events was cleared');
        }
    }

    /**
     * Рекурсивно обходит структуру событий и вызывает соответствующие обработчики.
     * @param obj - Текущий узел структуры событий.
     * @param keys - Массив строк, представляющих путь до обработчиков событий.
     * @param event - Объект события.
     * @param eventData - Дополнительные данные события.
     */
    private traverse(obj: CallbackNode, keys: string[], event: Event | null, eventData: any): void {
        for (const key of keys) {
            const eventParts = key.split('.');
            let target = obj;

            for (const part of eventParts) {
                if (target && target[part] && (target[part] as CallbackNode)["callbacks"]) {

                    if ((target[part] as CallbackNode)["callbacks"] != undefined || (target[part] as CallbackNode)["callbacks"] != null) 
                    {
                        (target[part] as CallbackNode)["callbacks"].forEach((callback: Callback) => {
                            callback(eventData || event);
                        });
                    }
                }
                target = target[part] as CallbackNode;
            }
        }
    }

    /**
     * Вызывает обработчики событий для указанных ключей.
     * @param keys - Массив строк, представляющих путь до обработчиков событий.
     * @param event - Объект события.
     * @param eventData - Дополнительные данные события.
     */
    private _callEventCallbacks(keys: string[], event: Event, eventData: any): void {
        this.traverse(this.customCallbacks, keys, event, eventData);
    }

    /**
     * Запускает WebSocket соединение.
     */
    public start(): void {
        this.connect();
    }

    /**
     * Подключается к WebSocket серверу.
     */
    private async connect(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (this.debug) {
                console.log('[WebSocket] connection created');
            }
            const socket = new WebSocket(this.url + `?token=${this.pageId}`);

            socket.onclose = (errorEvent) => {
                this.onClose(errorEvent);
                reject(errorEvent);
            };

            socket.onopen = (event) => {
                this.socket = socket;
                this.initSocketEvents();

                this._callEventCallbacks(['open'], event, null);

                if (this.debug) {
                    console.log('[WebSocket] connection opened (in connection handler):', event);
                }

                this.setSocketOpen(true);
                this.isReconnecting = false;
                this.reconnectionAttempts = 0;

                setTimeout(() => {
                    this.sendQueuedMessages().then(() => {

                    });
                }, 100);

                resolve();
            };
        });
    }

    /**
     * Инициализирует обработчики событий для WebSocket соединения.
     */
    private initSocketEvents(): void {
        this.socket.onopen = this.onOpen.bind(this);
        this.socket.onmessage = this.onMessage.bind(this);
        this.socket.onclose = this.onClose.bind(this);
        this.socket.onerror = this.onError.bind(this);
    }

    /**
     * Обработчик события открытия WebSocket соединения.
     * @param event - Объект события открытия соединения.
     */
    private onOpen(event: Event): void {
        if (this.debug) {
            console.log('[WebSocket] connection opened:', event);
        }

        this.setSocketOpen(true);

        this._callEventCallbacks(['open'], event, null);

        this.sendQueuedMessages().then(() => {

        });
    }

    /**
     * Обработчик события получения сообщения по WebSocket.
     * @param event - Объект события получения сообщения.
     */
    private onMessage(event: MessageEvent): void {
        if (this.debug) {
            console.log('[WebSocket] message received:');
            console.log(event.data);
        }

        const eventData = JSON.parse(event.data);
        const identifier = eventData.identifier;

        if (identifier) {
            const eventTypes = ["message." + identifier];
            this._callEventCallbacks(eventTypes, event, eventData);
        }

        this._callEventCallbacks(['message'], event, event.data);
    }

    /**
     * Обработчик события закрытия WebSocket соединения.
     * @param event - Объект события закрытия соединения.
     */
    private async onClose(event: CloseEvent): Promise<void> {
        if (this.debug) {
            console.log('[WebSocket] connection closed:', event);
        }

        this.setSocketOpen(false);

        // Добавьте вызов соответствующих обработчиков для события закрытия соединения
        this._callEventCallbacks(['close'], event, null);

        // Обнуляем очередь сообщений только если соединение было действительно закрыто
        if (!this.isReconnecting && event.wasClean) {
            this.messageQueue = [];
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // Задержка в 5 секунд перед первой попыткой переподключенияы
        await this.reconnect();
    }

    /**
     * Метод переподключения к WebSocket серверу с использованием цикла попыток и задержек между ними.
     * @returns {Promise<void>} - Промис, представляющий завершение операции переподключения.
     */
    private async reconnect() : Promise<void> {
        this.reconnectionAttempts = 0;

        if (this.isReconnecting) {
            return;
        }

        this.isReconnecting = true;

        while (this.shouldReconnect()) {
            try {
                if (this.debug) {
                    console.log(`[WebSocket] Reconnecting attempt ${this.reconnectionAttempts + 1}...`);
                }

                const socket = new WebSocket(this.url+ `?token=${this.pageId}`);

                let event = await new Promise<Event>((resolve, reject) => {
                    socket.onopen = (event) => {
                        resolve(event);
                    };
                    socket.onerror = (error) => {
                        reject(error);
                    };
                });

                this.closePreviousSocket();
                this.socket = socket;

                this._callEventCallbacks(['open'], event, null);

                if (this.debug) {
                    console.log('[WebSocket] connection opened (in reconnection handler):', event);
                }

                this.setSocketOpen(true);
                this.initSocketEvents();
                this.isReconnecting = false;

                setTimeout(() => {
                    this.sendQueuedMessages().then(() => {

                    });
                }, 100);

                return;
            } catch (error) {
                if (this.debug) {
                    console.error('[WebSocket] Reconnection attempt failed:', error);
                }
                this.reconnectionAttempts++;
                await new Promise(resolve => setTimeout(resolve, this.reconnectionInterval));
            }
        }

        if (this.debug) {
            console.log('[WebSocket] Maximum reconnection attempts reached or disabled');
        }
        this.isReconnecting = false;
    }

    /**
     * Метод закрытия предыдущего сокета.
     * Если сокет существует и его состояние не равно CLOSED, то он закрывается.
     * В противном случае метод ничего не делает.
     */
    private closePreviousSocket() {
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
            console.log('Closing previous socket connection...');
            this.socket.close();
        }
    }

    /**
     * Определяет, следует ли производить попытку переподключения к WebSocket серверу.
     * Учитывает установленное значение `keepAlive` и количество попыток переподключения (`maxReconnectionAttempts`).
     * @returns {boolean} - `true`, если переподключение необходимо, `false` в противном случае.
     */
    private shouldReconnect(): boolean {
        if (this.keepAlive && this.isReconnecting) { // Если keepAlive установлен в true, игнорируем maxReconnectionAttempts
            return this.isReconnecting;
        } else { // Если keepAlive установлен в false, учитываем maxReconnectionAttempts
            return this.reconnectionAttempts < this.maxReconnectionAttempts && this.isReconnecting;
        }
    }

    /**
     * Обработчик события ошибки WebSocket соединения.
     * @param error - Объект события ошибки.
     */
    private onError(error: Event): void {
        if (this.debug) {
            console.error('[WebSocket] error:', error);
        }
        // Добавьте вызов соответствующих обработчиков для события ошибки
        this._callEventCallbacks(['error'], error, null);
    }

    /**
     * Отправляет все сообщения из очереди по WebSocket, обрабатывает ошибки и планирует следующую отправку через интервал.
     * @returns Promise, который разрешается после завершения отправки всех сообщений.
     */
    private async sendQueuedMessages(): Promise<void> {
        while (this.messageQueue.length > 0 && this.socket && this.isSocketOpen()) {
            const message = this.messageQueue[0];
            try {
                this.sendMessageToSocket(message.token, message.command, message.data);
                this.messageQueue.shift();

                if (this.debug) {
                    console.log('[WebSocket] Message in queue:', this.messageQueue.length);
                }

            } catch (error) {
                if (this.debug) {
                    console.error('[WebSocket] Error sending message:', error);
                }
            }

            // Планируем следующую отправку сообщения через интервал
            await new Promise(resolve => setTimeout(resolve, this.sendingInterval));
        }
    }

    /**
     * Отправляет сообщение по WebSocket, если соединение открыто.
     * @param token - Токен сообщения.
     * @param command - Команда сообщения.
     * @param data - Данные сообщения.
     */
    private sendMessageToSocket(token: string, command: string, data: any): void {
        if (this.socket && this.isSocketOpen()) {
            this.socket.send(JSON.stringify({token, command, data}));

            if (this.debug) {
                console.log('[WebSocket] message send:', token);
            }
        }
    }

    /**
     * Отправляет сообщение в очередь сообщений для последующей отправки по WebSocket.
     * @param command - Команда сообщения.
     * @param data - Данные сообщения.
     * @returns Promise, который разрешается токеном сообщения.
     */
    public message(command: string, data: any): Promise<string> {
        return new Promise((resolve) => {
            const token = this.generateToken();
            resolve(token);

            const message = {token, command, data};

            this.messageQueue.push(message);

            if (this.debug) {
                console.log('[WebSocket] message added to queue:', message);
            }

            // Если активной отправки нет и соединение открыто, начинаем отправку
            if (this.messageQueue.length === 1 && this.isSocketOpen()) {
                this.sendQueuedMessages();
            }
        });
    }

    /**
     * Генерирует уникальный токен для идентификации сообщений.
     * @returns Уникальный токен.
     */
    private generateToken(): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';

        for (let i = 0; i < 16; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            token += characters.charAt(randomIndex);
        }

        return token;
    }

    /**
     * Закрывает WebSocket соединение.
     * @returns Promise, который разрешается после закрытия соединения.
     */
    public async stop(): Promise<void> {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            await new Promise<void>(resolve => {
                this.socket.onclose = (event) => {
                    // Если соединение было закрыто явно, прекратить переподключение
                    if (!this.isReconnecting && event.wasClean) {
                        this.reconnectionAttempts = 0;
                        this.isReconnecting = false;
                        this.messageQueue = [];
                    }
                    resolve();
                };

                this.socket.close();
                this.setSocketOpen(false);

                if (this.debug) {
                    console.log('[WebSocket] socket close');
                }
            });

            return;
        } else {
            this.isReconnecting = false;
            this.messageQueue = [];
        }
    }
}

export { WebSocketClient };