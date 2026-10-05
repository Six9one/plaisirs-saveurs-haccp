import React, { useState } from 'react';
import type { User } from '../types';
import { DEFAULT_USERS } from '../utils/storage';
import { UserCheck, KeyRound } from 'lucide-react';

interface PinModalProps {
  currentUser: User;
  onSelectUser: (user: User) => void;
  onClose: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  currentUser,
  onSelectUser,
  onClose,
}) => {
  const [selectedUserCandidate, setSelectedUserCandidate] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleUserClick = (user: User) => {
    setSelectedUserCandidate(user);
    setPinInput('');
    setErrorMsg('');
  };

  const handleDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      if (newPin.length === 4 && selectedUserCandidate) {
        if (newPin === selectedUserCandidate.pin) {
          onSelectUser(selectedUserCandidate);
          onClose();
        } else {
          setErrorMsg('Code PIN incorrect');
          setPinInput('');
        }
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900">Changer d'utilisateur</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* User Selection */}
        {!selectedUserCandidate ? (
          <div className="py-4 space-y-2">
            <p className="text-xs text-slate-500 mb-3">Sélectionnez votre profil :</p>
            {DEFAULT_USERS.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserClick(user)}
                className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  currentUser.id === user.id
                    ? 'border-amber-500 bg-amber-50/50'
                    : 'border-slate-200 hover:border-amber-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm overflow-hidden shrink-0"
                    style={{
                      border: `3px solid ${user.avatarColor || '#f59e0b'}`,
                      background: user.avatarColor || '#f59e0b',
                    }}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black">{user.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-900 leading-tight">{user.name}</div>
                    <div
                      className="text-xs font-semibold mt-0.5"
                      style={{ color: user.avatarColor || '#f59e0b' }}
                    >
                      {user.role}
                    </div>
                  </div>
                </div>
                {currentUser.id === user.id && (
                  <UserCheck className="w-4 h-4 text-amber-600" />
                )}
              </button>
            ))}
          </div>
        ) : (
          /* PIN Keypad */
          <div className="py-4 space-y-4 text-center">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white font-bold flex items-center justify-center text-xl shadow-md overflow-hidden mx-auto mb-2 border-2 border-amber-400">
                {selectedUserCandidate.avatarUrl ? (
                  <img src={selectedUserCandidate.avatarUrl} alt={selectedUserCandidate.name} className="w-full h-full object-cover" />
                ) : (
                  selectedUserCandidate.name.charAt(0)
                )}
              </div>
              <div className="text-xs font-semibold text-slate-500">Connexion en tant que :</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedUserCandidate.name}</div>
            </div>

            {/* PIN Dots */}
            <div className="flex justify-center gap-3 my-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all ${
                    idx < pinInput.length ? 'bg-amber-500 scale-110' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {errorMsg && (
              <p className="text-xs font-bold text-rose-600 animate-shake">{errorMsg}</p>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    if (k === 'C') setPinInput('');
                    else if (k === '⌫') handleBackspace();
                    else handleDigit(k);
                  }}
                  className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-amber-200 text-slate-900 font-bold text-base flex items-center justify-center transition-colors"
                >
                  {k}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelectedUserCandidate(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline mt-2"
            >
              ← Choisir un autre profil
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
