import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../firebase";
import { Send, ChevronLeft, User, Trash2, Heart, ThumbsUp, Smile, ImagePlus, Mic, Square } from "lucide-react";
import toast from "react-hot-toast";

interface Message {
  id: string;
  text?: string;
  senderId: string;
  createdAt: any;
  reactions?: string[];
  imageUrl?: string;
  audioUrl?: string;
}

export default function Chat() {
  const { userId } = useParams<{ userId: string }>(); // ID of the other user
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleDeleteMessage = async (messageId: string) => {
    if (!chatId) return;
    try {
      await deleteDoc(doc(db, "chats", chatId, "messages", messageId));
      toast.success("Message supprimé");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!chatId) return;
    try {
      const message = messages.find(m => m.id === messageId);
      let newReactions = message?.reactions ? [...message.reactions] : [];
      if (newReactions.includes(emoji)) {
        newReactions = newReactions.filter(r => r !== emoji);
      } else {
        newReactions.push(emoji);
      }
      await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
        reactions: newReactions
      });
    } catch (error) {
      console.error("Error reacting to message:", error);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const initChat = async () => {
      if (!currentUser || !userId) return;

      // Fetch other user's info
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        setOtherUser(userDoc.data());
      }

      // Check if chat exists
      const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      let existingChatId = null;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(userId)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        setChatId(existingChatId);
      } else {
        setLoading(false); // No chat exists yet, but we are ready to create one on first message
      }
    };

    initChat();
  }, [userId, currentUser]);

  useEffect(() => {
    if (!chatId || !currentUser) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, (error) => {
      console.error("Messages listener error:", error);
    });

    return () => unsubscribe();
  }, [chatId, currentUser]);

  const sendMessageData = async (data: Partial<Message>) => {
    if (!auth.currentUser || !userId) return;
    try {
      let currentChatId = chatId;
      if (!currentChatId) {
        const newChatRef = await addDoc(collection(db, "chats"), {
          participants: [auth.currentUser.uid, userId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: data.text || (data.imageUrl ? "Image" : data.audioUrl ? "Audio" : "Nouveau message"),
          lastMessageSenderId: auth.currentUser.uid
        });
        currentChatId = newChatRef.id;
        setChatId(currentChatId);
      }

      await addDoc(collection(db, "chats", currentChatId, "messages"), {
        ...data,
        senderId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "chats", currentChatId), {
        lastMessage: data.text || (data.imageUrl ? "Image" : data.audioUrl ? "Audio" : "Nouveau message"),
        updatedAt: serverTimestamp(),
        lastMessageSenderId: auth.currentUser.uid
      });
    } catch (error) {
      console.error("Error sending message data:", error);
      toast.error("Erreur lors de l'envoi.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `chat_images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await sendMessageData({ imageUrl: downloadURL });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erreur lors de l'upload de l'image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const storageRef = ref(storage, `chat_audios/${Date.now()}.webm`);
          const snapshot = await uploadBytes(storageRef, audioBlob);
          const downloadURL = await getDownloadURL(snapshot.ref);
          await sendMessageData({ audioUrl: downloadURL });
        } catch (error) {
          console.error("Error uploading audio:", error);
          toast.error("Erreur lors de l'envoi de l'audio.");
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser || !userId) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    await sendMessageData({ text: messageText });
  };

  if (!auth.currentUser) return null;

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-4">
        <Link to="/messages" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </Link>
        
        <Link to={`/seller/${userId}`} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold overflow-hidden">
            {otherUser?.photoURL ? (
              <img src={otherUser.photoURL} alt={otherUser?.name} className="w-full h-full object-cover" />
            ) : (
              otherUser?.name?.substring(0, 2).toUpperCase() || <User className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{otherUser?.name || "Utilisateur"}</h2>
          </div>
        </Link>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-slate-500 font-medium">
            Envoyez un message pour démarrer la discussion.
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === auth.currentUser?.uid;
            return (
              <div 
                key={msg.id || idx} 
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-4`}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div 
                    className={`relative max-w-[75%] rounded-2xl px-4 py-2 ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-br-sm' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="Message" className="rounded-lg max-w-[200px] mb-1" />
                    )}
                    {msg.audioUrl && (
                      <audio controls src={msg.audioUrl} className="max-w-[200px] mb-1" />
                    )}
                    {msg.text && <p className="text-[15px]">{msg.text}</p>}
                    
                    {/* Display Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} bg-white border border-slate-200 rounded-full px-1.5 py-0.5 text-xs shadow-sm flex gap-1`}>
                        {msg.reactions.map((r, i) => (
                          <span key={i}>{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Hover Actions */}
                  <div className={`flex items-center gap-1 transition-opacity duration-200 ${hoveredMessageId === msg.id ? 'opacity-100' : 'opacity-0'}`}>
                    <button 
                      onClick={() => handleReact(msg.id, '❤️')}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="J'aime"
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleReact(msg.id, '👍')}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      title="Super"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    {isMe && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center relative">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
        />
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage || isRecording}
          className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
          title="Ajouter une image"
        >
          {uploadingImage ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> : <ImagePlus className="w-5 h-5" />}
        </button>

        {isRecording ? (
          <button 
            type="button" 
            onClick={stopRecording}
            className="p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-full transition-colors animate-pulse"
            title="Arrêter l'enregistrement"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>
        ) : (
          <button 
            type="button" 
            onClick={startRecording}
            disabled={uploadingImage}
            className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
            title="Envoyer un audio"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isRecording || uploadingImage}
            placeholder={isRecording ? "Enregistrement en cours..." : "Écrivez votre message..."}
            className="flex-1 bg-slate-100 border-transparent focus:bg-white border focus:border-indigo-500 rounded-2xl px-4 py-3 outline-none transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isRecording || uploadingImage}
            className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
