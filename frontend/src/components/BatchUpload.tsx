import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, ImagePlus, CloudUpload, CheckCircle, AlertCircle, FileIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { FaceSearchApi } from '@/api/face-search.api';

interface BatchUploadProps {
  onUploadComplete?: () => void;
  className?: string;
}

interface FileUploadState {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number; // 0-100 for UI
  errorMessage?: string;
}

const api = new FaceSearchApi();

export const BatchUpload: React.FC<BatchUploadProps> = ({ onUploadComplete, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: FileUploadState[] = Array.from(fileList).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'pending',
      progress: 0
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Queue Processing Logic
  useEffect(() => {
    if (!isUploading) return;

    // Count active uploads
    const activeUploads = files.filter(f => f.status === 'uploading' || f.status === 'processing').length;
    const pendingFiles = files.filter(f => f.status === 'pending');

    // If there are slots available (max 4) and pending files
    if (activeUploads < 4 && pendingFiles.length > 0) {
      const nextFile = pendingFiles[0];
      processFile(nextFile);
    }

    // Check if all finished
    const allFinished = files.length > 0 && files.every(f => f.status === 'success' || f.status === 'error');
    if (allFinished) {
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: ['images'] });
      if (onUploadComplete) onUploadComplete();
    }
  }, [files, isUploading, queryClient, onUploadComplete]);

  const processFile = async (fileState: FileUploadState) => {
      // Set status to uploading immediately to reserve slot
      setFiles(prev => prev.map(f => f.id === fileState.id ? { ...f, status: 'uploading' } : f));

      const formData = new FormData();
      formData.append('file', fileState.file);

      try {
          await api.upload(formData, (percent) => {
              setFiles(prev => prev.map(f => {
                  if (f.id !== fileState.id) return f;
                  
                  // Map upload progress (0-100) to UI progress (0-90)
                  const uiProgress = Math.round(percent * 0.9);
                  
                  // If upload is 100% complete, switch to 'processing' (Yellow phase)
                  if (percent === 100) {
                      return { ...f, status: 'processing', progress: 95 };
                  }
                  
                  return { ...f, status: 'uploading', progress: uiProgress };
              }));
          });
          
          // Success (Green phase)
          console.log('Upload success:', fileState.file.name);
          setFiles(prev => prev.map(f => f.id === fileState.id ? { ...f, status: 'success', progress: 100 } : f));

      } catch (err) {
          console.error(err);
          setFiles(prev => prev.map(f => f.id === fileState.id ? { ...f, status: 'error', errorMessage: 'Upload failed' } : f));
      }
  };

  const handleStartUpload = () => {
    if (files.length === 0) return;
    setIsUploading(true);
  };

  const handleClear = () => {
    if (isUploading) return;
    setFiles([]);
  };

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUploading) return;
    setFiles(files.filter(f => f.id !== id));
  };

  const getProgressColor = (item: FileUploadState) => {
      // 0% - Gray (pending)
      if (item.status === 'pending' || item.progress === 0) return 'bg-muted';
      
      // Error - Red
      if (item.status === 'error') return 'bg-red-500';
      
      // 100% - Green (success)
      if (item.status === 'success' || item.progress === 100) return 'bg-green-500';
      
      // 90-<100% (or processing status) - Yellow
      if (item.status === 'processing' || (item.progress >= 90 && item.progress < 100)) return 'bg-yellow-500';
      
      // 0-90% - Blue (uploading)
      return 'bg-blue-500';
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload Photos
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-muted/30">
           <h3 className="font-semibold text-foreground flex items-center gap-2">
             <CloudUpload className="w-5 h-5 text-primary" />
             Batch Upload
           </h3>
           <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} disabled={isUploading} className="h-8 w-8">
             <X className="w-5 h-5 text-muted-foreground" />
           </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {(!isUploading && files.length === 0) && (
             <div 
                className={cn(
                "border-2 border-dashed rounded-xl p-8 transition-colors text-center cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                )}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => handleFiles(e.target.files)}
                />
                
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <ImagePlus className="w-8 h-8" />
                </div>
                <p className="text-lg font-medium text-foreground mb-1">
                Click to upload or drag and drop
                </p>
                <p className="text-sm text-muted-foreground">
                Support for multiple image files
                </p>
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-foreground">Files ({files.length})</span>
                {!isUploading && (
                    <Button variant="ghost" size="sm" onClick={handleClear} className="text-destructive hover:text-destructive h-auto p-0 hover:bg-transparent">
                        Clear all
                    </Button>
                )}
              </div>
              
              <div className="space-y-2 max-h-75 overflow-y-auto pr-2">
                {files.map((item) => (
                  <div key={item.id} className="bg-muted/30 border border-border rounded-lg p-3 relative overflow-hidden group">
                     {/* Progress Background */}
                     {item.status !== 'pending' && item.status !== 'error' && (
                         <div 
                            className={cn("absolute bottom-0 left-0 h-1 transition-all duration-300", getProgressColor(item))}
                            style={{ width: `${item.progress}%` }}
                         />
                     )}
                     
                     <div className="flex justify-between items-center gap-3">
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                            <div className={cn(
                                "w-8 h-8 rounded flex items-center justify-center shrink-0",
                                item.status === 'success' ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                                item.status === 'error' ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                                "bg-muted text-muted-foreground"
                            )}>
                                {item.status === 'success' ? <CheckCircle className="w-4 h-4" /> :
                                 item.status === 'error' ? <AlertCircle className="w-4 h-4" /> :
                                 item.status === 'uploading' || item.status === 'processing' ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> :
                                 <FileIcon className="w-4 h-4" />}
                            </div>
                            
                            <div className="flex flex-col overflow-hidden">
                                <span className="truncate text-sm font-medium text-foreground">{item.file.name}</span>
                                <span className="text-xs text-muted-foreground">
                                    {item.status === 'pending' && 'Waiting...'}
                                    {item.status === 'uploading' && `Uploading ${Math.round(item.progress / 0.9)}%` /* Show real upload percent */}
                                    {item.status === 'processing' && 'Detecting faces...'}
                                    {item.status === 'success' && 'Completed'}
                                    {item.status === 'error' && 'Failed'}
                                </span>
                            </div>
                        </div>

                        {!isUploading && item.status === 'pending' && (
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => removeFile(item.id, e)}
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                     </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30 flex justify-end gap-3">
           <Button 
             variant="outline"
             onClick={() => setIsOpen(false)}
             disabled={isUploading}
           >
             Close
           </Button>
           <Button
            onClick={handleStartUpload}
            disabled={isUploading || files.length === 0 || files.every(f => f.status === 'success')}
          >
            {isUploading ? 'Uploading...' : 'Start Upload'}
          </Button>
        </div>
      </div>
    </div>
  );
};