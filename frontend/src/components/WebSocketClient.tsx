const WebSocketClient = new WebSocket('ws://localhost:3000');

WebSocketClient.onopen = () => {
  console.log('Connected to the WebSocket server.');
};

WebSocketClient.onclose = () => {
  console.log('Disconnected from WebSocket server.');
};

export default WebSocketClient;
