import { FaPhoneAlt, FaVideo, FaTimes } from "react-icons/fa";

interface CallUIProps {
  caller: string;
  type: "audio" | "video";
  onAccept: () => void;
  onReject: () => void;
}

function CallUI({ caller, type, onAccept, onReject }: CallUIProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-6 w-80 text-center shadow-xl">

        <p className="text-gray-300 text-sm mb-1">Incoming {type} call</p>
        <h2 className="text-white text-xl font-semibold mb-6">
          {caller}
        </h2>

        <div className="flex justify-around items-center">
          {/* Reject */}
          <button
            onClick={onReject}
            className="bg-red-600 hover:bg-red-700 p-4 rounded-full text-white text-xl"
          >
            <FaTimes />
          </button>

          {/* Accept */}
          <button
            onClick={onAccept}
            className="bg-green-600 hover:bg-green-700 p-4 rounded-full text-white text-xl"
          >
            {type === "audio" ? <FaPhoneAlt /> : <FaVideo />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CallUI;
