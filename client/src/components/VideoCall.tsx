import { useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";

interface VideoCallProps {
  socket: Socket;
  room: string;
  isCaller: boolean;
  onEnd: () => void;
}

const iceServers: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VideoCall({
  socket,
  room,
  isCaller,
  onEnd,
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  /* ================= END CALL ================= */
  const endCall = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    onEnd();
  }, [onEnd]);

  /* ================= START MEDIA ================= */
  const startMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    peerRef.current = new RTCPeerConnection(iceServers);

    stream.getTracks().forEach((track) => {
      peerRef.current!.addTrack(track, stream);
    });

    peerRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice_candidate", {
          room,
          candidate: event.candidate,
        });
      }
    };

    if (isCaller) {
      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);

      socket.emit("webrtc_offer", { room, offer });
    }
  }, [socket, room, isCaller]);

  /* ================= SOCKET EVENTS ================= */
  useEffect(() => {
    startMedia();

    socket.on("webrtc_offer", async ({ offer }) => {
      if (!peerRef.current) return;

      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);

      socket.emit("webrtc_answer", { room, answer });
    });

    socket.on("webrtc_answer", async ({ answer }) => {
      if (!peerRef.current) return;

      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    socket.on("ice_candidate", async ({ candidate }) => {
      if (!peerRef.current) return;

      await peerRef.current.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    });

    socket.on("call_ended", endCall);

    return () => {
      socket.off("webrtc_offer");
      socket.off("webrtc_answer");
      socket.off("ice_candidate");
      socket.off("call_ended");
    };
  }, [socket, room, startMedia, endCall]);

  /* ================= UI ================= */
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
      <div className="flex gap-6">
        {/* LOCAL VIDEO */}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-72 h-52 rounded-lg border border-white"
        />

        {/* REMOTE VIDEO */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-72 h-52 rounded-lg border border-white"
        />
      </div>

      <button
        onClick={() => {
          socket.emit("end_call", { room });
          endCall();
        }}
        className="mt-8 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full"
      >
        End Call
      </button>
    </div>
  );
}
