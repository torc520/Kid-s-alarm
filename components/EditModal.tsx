
import React, { useState, useEffect, useRef } from 'react';
import { Alarm } from '../types';
import { Check, X } from 'lucide-react';

interface EditModalProps {
  alarm: Alarm;
  onClose: () => void;
  onSave: (alarm: Alarm) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ alarm, onClose, onSave }) => {
  const [text, setText] = useState(alarm.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(text.length, text.length);
    }
  }, []);

  const handleSave = () => {
    onSave({ ...alarm, text });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 animate-in zoom-in-95"
        style={{ backgroundColor: '#fff9c4' }} // Classic sticky yellow
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-black/5">
          <h3 className="text-gray-500 font-bold text-sm">Edit Note</h3>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your note here..."
            className="w-full h-48 bg-transparent text-xl font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Footer Actions */}
        <div className="p-6 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl font-bold text-gray-500 hover:bg-black/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-2.5 bg-sky-500 text-white rounded-2xl font-bold shadow-lg shadow-sky-200 hover:bg-sky-600 active:scale-95 transition-all flex items-center gap-2"
          >
            <Check size={20} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
