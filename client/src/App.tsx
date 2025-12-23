import { useState } from "react";
import io from "socket.io-client";
import Chat from "./components/Chat";

const SOCKET_SERVER_URL = "http://localhost:3001";
const socket = io(SOCKET_SERVER_URL);

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);

  const joinRoom = () => {
    if (username.trim() && room.trim()) {
      setShowChat(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center text-white
    bg-gradient-to-br from-slate-900 via-indigo-900 to-black px-6">

      {!showChat ? (
        <div className="w-[360px] flex flex-col items-center text-center
        space-y-4 bg-white/10 backdrop-blur-xl rounded-2xl
        py-8 px-6 shadow-2xl">

          <h1 className="text-4xl font-extrabold">
            Welcome to <span className="text-blue-400">SYNOX</span>
          </h1>

          <input
            placeholder="Your nickname"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 rounded-lg bg-black/30 text-white"
          />

          <input
            placeholder="Room ID"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="w-full p-3 rounded-lg bg-black/30 text-white"
          />

          <button
            onClick={joinRoom}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700"
          >
            Join Room 🚀
          </button>
        </div>
      ) : (
        <Chat socket={socket} username={username} room={room} />
      )}
    </div>
  );
}

export default App;
