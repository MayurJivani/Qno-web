# QNO

[![Live](https://img.shields.io/website?url=https%3A%2F%2Fqno.futile.studio&label=qno.futile.studio&style=flat-square)](https://qno.futile.studio)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node-backend-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)
![Multiplayer](https://img.shields.io/badge/multiplayer-real--time-orange?style=flat-square)
[![Last commit](https://img.shields.io/github/last-commit/MayurJivani/Qno-web?style=flat-square)](https://github.com/MayurJivani/Qno-web/commits/main)
[![Stars](https://img.shields.io/github/stars/MayurJivani/Qno-web?style=flat-square)](https://github.com/MayurJivani/Qno-web/stargazers)
[![Issues](https://img.shields.io/github/issues/MayurJivani/Qno-web?style=flat-square)](https://github.com/MayurJivani/Qno-web/issues)
![Code size](https://img.shields.io/github/languages/code-size/MayurJivani/Qno-web?style=flat-square)

A real-time multiplayer card game that teaches quantum computing by making you
play with it. Uno rules, plus quantum gates, superposition and entanglement as
cards you hold in your hand.

**Play it:** [qno.futile.studio](https://qno.futile.studio)

The Unity original is in [Qno](https://github.com/MayurJivani/Qno); this is the
browser rewrite.

## Layout

```
frontend/   the game client
backend/    the room server
```

## Running it

```bash
npm run build     # builds both halves
npm start         # serves the backend, which serves the client
```
