import { io } from 'socket.io-client';
import { API_ORIGIN } from './api';

export const socket = io(API_ORIGIN, {
  transports: ['websocket'],
  autoConnect: true,
});
