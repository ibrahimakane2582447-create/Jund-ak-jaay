import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, getDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Link } from "react-router-dom";
import { User, MessageCircle, Bell } from "lucide-react";

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageSenderId?: string;
  updatedAt?: any;
  otherUser?: any;
}

export default function Messages() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (!user) {
        setChats([]);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatsData = await Promise.all(snapshot.docs.map(async (chatDoc) => {
        const data = chatDoc.data();
        const otherUserId = data.participants.find((id: string) => id !== currentUser.uid);
        
        let otherUser = null;
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, "users", otherUserId));
          if (userDoc.exists()) {
            otherUser = { id: userDoc.id, ...userDoc.data() };
          }
        }

        return {
          id: chatDoc.id,
          ...data,
          otherUser
        } as Chat;
      }));
      
      chatsData.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setChats(chatsData);
      setLoading(false);
    }, (error) => {
      console.error("Chats listener error:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-indigo-600" />
          Messages
        </h1>
        <button className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
          <Bell className="w-6 h-6" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-50"></span>
        </button>
      </div>

      {chats.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
          <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Aucun message</h2>
          <p className="text-slate-500">Vous n'avez pas encore de conversations.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          {chats.map((chat) => (
            <Link 
              key={chat.id} 
              to={`/chat/${chat.otherUser?.id}`}
              className="flex items-center gap-4 p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
            >
              <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                {chat.otherUser?.photoURL ? (
                  <img src={chat.otherUser.photoURL} alt={chat.otherUser.name} className="w-full h-full object-cover" />
                ) : (
                  chat.otherUser?.name?.substring(0, 2).toUpperCase() || <User className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-slate-900 truncate flex items-center gap-2">
                    {chat.otherUser?.name || "Utilisateur"}
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0" title="En discussion"></span>
                  </h3>
                  {chat.updatedAt && (
                    <span className="text-xs font-medium text-slate-400 shrink-0 ml-2">
                      {chat.updatedAt.toDate ? chat.updatedAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-500 truncate font-medium flex-1 mr-2">
                    {chat.lastMessage || "Nouvelle conversation"}
                  </p>
                  {chat.lastMessageSenderId !== currentUser?.uid && chat.lastMessage && (
                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                      1
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
