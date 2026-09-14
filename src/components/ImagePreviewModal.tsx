import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { UploadedImage } from '../types';

interface ImagePreviewModalProps {
  image: UploadedImage | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="truncate pr-4">
            <h4 className="text-sm font-semibold truncate">{image.name}</h4>
            <span className="text-[11px] text-slate-400">Referencia visual / Boceto</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 bg-slate-950 flex items-center justify-center overflow-auto max-h-[75vh]">
          <img
            src={image.dataUrl}
            alt={image.name}
            className="max-h-[70vh] w-auto object-contain rounded shadow-md"
          />
        </div>
      </div>
    </div>
  );
};
