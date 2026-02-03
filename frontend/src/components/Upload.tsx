import React, { useCallback, useState } from 'react';
import { Upload as UploadIcon, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils'; // Make sure this path is correct based on folder structure

interface UploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  value?: File | null;
  label?: string;
  className?: string;
}

export const Upload: React.FC<UploadProps> = ({ 
  onFileSelect, 
  isLoading = false,
  value,
  label = "Click to upload or drag and drop",
  className
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  React.useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [value]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer min-h-50",
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:bg-gray-50",
          isLoading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleChange}
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center text-gray-500">
            <Loader2 className="h-10 w-10 animate-spin mb-2" />
            <p className="text-sm">Processing...</p>
          </div>
        ) : preview ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={preview} 
              alt="Preview" 
              className="max-h-75 object-contain rounded-md" 
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(null as any); // Reset
              }}
              className="absolute top-2 right-2 bg-white/80 p-1 rounded-full hover:bg-white text-gray-700 shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-gray-500">
            <UploadIcon className="h-10 w-10 mb-2" />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-gray-400 mt-1">SVG, PNG, JPG or GIF</p>
          </div>
        )}
      </div>
    </div>
  );
};
