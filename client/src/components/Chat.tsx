import { useEffect, useState, useRef } from "react";
import { Socket } from "socket.io-client";
import { FaPhoneAlt, FaVideo } from "react-icons/fa";
import CallUI from "./CallUI";
import VideoCall from "./VideoCall";

interface ChatProps {
  socket: Socket;
  username: string;
  room: string;
}

interface MessageData {
  id: string;
  room: string;
  author: string;
  message?: string;
  audio?: string;
  file?: {
    name: string;
    type: string;
    data: string;
  };
  duration?: number;
  time: string;
  status: "sent" | "seen";
  type: "text" | "audio" | "file";
}

function Chat({ socket, username, room }: ChatProps) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState<MessageData[]>([]);
  const [typingUser, setTypingUser] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);

  // 🔔 Incoming call popup
  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    type: "audio" | "video";
  } | null>(null);

  // 📞 Active call (audio/video)
  const [activeCall, setActiveCall] = useState<{
    type: "audio" | "video";
    isCaller: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isTabFocused = useRef(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  /* ================= TAB FOCUS ================= */
  useEffect(() => {
    const onFocus = () => (isTabFocused.current = true);
    const onBlur = () => (isTabFocused.current = false);

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  /* ================= JOIN ROOM ================= */
  useEffect(() => {
    socket.emit("join_room", { room, username });
  }, [socket, room, username]);

  /* ================= SEND TEXT ================= */
  const sendMessage = () => {
    if (!currentMessage.trim()) return;

    socket.emit("send_message", {
      id: crypto.randomUUID(),
      room,
      author: username,
      message: currentMessage,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
      type: "text",
    });

    socket.emit("stop_typing", room);
    setCurrentMessage("");
  };

  /* ================= FILE ================= */
  const sendFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      socket.emit("send_message", {
        id: crypto.randomUUID(),
        room,
        author: username,
        file: {
          name: file.name,
          type: file.type,
          data: reader.result as string,
        },
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "sent",
        type: "file",
      });
    };
    reader.readAsDataURL(file);
  };

  /* ================= AUDIO ================= */
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = () => {
        socket.emit("send_message", {
          id: crypto.randomUUID(),
          room,
          author: username,
          audio: reader.result as string,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "sent",
          type: "audio",
        });
      };
      reader.readAsDataURL(blob);
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  /* ================= DELETE ================= */
  const deleteMessage = (id: string) => {
    socket.emit("delete_message", { room, messageId: id });
  };

  /* ================= SOCKET LISTENERS ================= */
  useEffect(() => {
    socket.on("receive_message", (data: MessageData) => {
      setMessageList((prev) => [...prev, data]);

      if (data.author !== username && isTabFocused.current) {
        socket.emit("message_seen", { room: data.room, messageId: data.id });
      }
    });

    socket.on("message_seen", (id: string) => {
      setMessageList((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "seen" } : m))
      );
    });

    socket.on("message_deleted", (id: string) => {
      setMessageList((prev) => prev.filter((m) => m.id !== id));
    });

    // 📞 CALL SIGNALS
    socket.on("incoming_call", ({ from, type }) => {
      setIncomingCall({ from, type });
    });

    socket.on("call_accepted", ({ type }) => {
      setIncomingCall(null);
      setActiveCall({ type, isCaller: false });
    });

    socket.on("call_rejected", () => {
      setIncomingCall(null);
      alert("Call rejected");
    });

    socket.on("call_ended", () => {
      setActiveCall(null);
    });

    socket.on("user_typing", setTypingUser);
    socket.on("user_stop_typing", () => setTypingUser(""));
    socket.on("room_users", setOnlineUsers);

    return () => {
      socket.removeAllListeners();
    };
  }, [socket, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList, typingUser]);

  const formatDuration = (s?: number) =>
    !s || !isFinite(s)
      ? "0:00"
      : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <>
      {/* ================= CHAT UI ================= */}
      <div className="flex w-full max-w-5xl h-[85vh] bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">

        {/* USERS */}
        <div className="w-52 bg-black/40 p-4">
          <h3 className="text-white mb-3">Online ({onlineUsers.length})</h3>
          {onlineUsers.map((u) => (
            <div key={u} className="text-sm text-gray-200">{u}</div>
          ))}
        </div>

        {/* CHAT */}
        <div className="flex flex-col flex-1">

          {/* HEADER */}
          <div className="px-6 py-4 bg-black/30 text-white flex justify-between items-center">
            <div>
              Room: <span className="text-blue-400">{room}</span>
            </div>

            <div className="flex gap-4 text-lg">
              <button
                title="Audio Call"
                onClick={() => {
                  socket.emit("call_user", { room, from: username, type: "audio" });
                  setActiveCall({ type: "audio", isCaller: true });
                }}
                className="text-green-400 hover:text-green-500"
              >
                <FaPhoneAlt />
              </button>

              <button
                title="Video Call"
                onClick={() => {
                  socket.emit("call_user", { room, from: username, type: "video" });
                  setActiveCall({ type: "video", isCaller: true });
                }}
                className="text-blue-400 hover:text-blue-500"
              >
                <FaVideo />
              </button>
            </div>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 px-6 py-4 overflow-y-auto space-y-3">
            {messageList.map((msg) => (
              <div key={msg.id} className={`flex ${msg.author === username ? "justify-end" : "justify-start"}`}>
                <div
                  onDoubleClick={() => msg.author === username && deleteMessage(msg.id)}
                  className="bg-gray-700 text-white p-3 rounded-xl max-w-[70%]"
                >
                  <p className="text-xs opacity-70">{msg.author}</p>

                  {msg.type === "text" && <p>{msg.message}</p>}

                  {msg.type === "audio" && (
                    <div className="mt-2 flex gap-2 items-center">
                      <audio controls src={msg.audio} />
                      <span className="text-xs">⏱ {formatDuration(msg.duration)}</span>
                    </div>
                  )}

                  {msg.type === "file" && msg.file && (
                    msg.file.type.startsWith("image/")
                      ? <img src={msg.file.data} className="mt-2 rounded max-w-xs" />
                      : <a href={msg.file.data} download className="underline">📄 {msg.file.name}</a>
                  )}

                  <div className="text-[10px] mt-1 flex justify-between">
                    <span>{msg.time}</span>
                    {msg.author === username && (
                      <span className={msg.status === "seen" ? "text-blue-400" : "text-green-400"}>
                        {msg.status === "seen" ? "Seen" : "Delivered"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {typingUser && typingUser !== username && (
              <p className="text-sm italic text-gray-300">{typingUser} is typing...</p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="flex p-4 bg-black/30">
            <input type="file" hidden id="fileInput" onChange={(e) => e.target.files && sendFile(e.target.files[0])} />
            <button onClick={() => document.getElementById("fileInput")?.click()} className="px-3">📎</button>

            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              className={`px-3 ${recording ? "text-red-500" : ""}`}
            >
              🎤
            </button>

            <input
              className="flex-1 mx-2 bg-gray-800 text-white p-2"
              value={currentMessage}
              onChange={(e) => {
                setCurrentMessage(e.target.value);
                socket.emit("typing", { room, username });
                if (!e.target.value) socket.emit("stop_typing", room);
              }}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type..."
            />

            <button onClick={sendMessage} className="px-4 bg-blue-600 text-white">
              Send
            </button>
          </div>
        </div>
      </div>

      {/* 🔔 INCOMING CALL POPUP */}
      {incomingCall && (
        <CallUI
          caller={incomingCall.from}
          type={incomingCall.type}
          onAccept={() => {
            socket.emit("accept_call", {
              room,
              from: username,
              to: incomingCall.from,
              type: incomingCall.type,
            });
            setIncomingCall(null);
            setActiveCall({ type: incomingCall.type, isCaller: false });
          }}
          onReject={() => {
            socket.emit("reject_call", {
              room,
              from: username,
              to: incomingCall.from,
            });
            setIncomingCall(null);
          }}
        />
      )}

      {/* 🎥 VIDEO CALL OVERLAY */}
      {activeCall && activeCall.type === "video" && (
        <VideoCall
  socket={socket}
  room={room}
  isCaller={activeCall.isCaller}
  onEnd={() => {
    setActiveCall(null);
    socket.emit("end_call", { room });
  }}
/>

      )}
    </>
  );
}

export default Chat;
