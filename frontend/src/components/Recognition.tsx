import React, { useState } from 'react';
import { api } from '../api/api';
import { Upload } from './Upload';
import { ScanFace } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface FaceRecognition {
  box: [number, number, number, number]; // x, y, w, h
  person: string;
  distance: number;
}

interface RecognitionResponse {
  faces: FaceRecognition[];
}

export const Recognition: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<RecognitionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageSize, setImageSize] = useState<{width: number, height: number} | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    if (selectedFile) {
        const img = new Image();
        img.onload = () => {
             setImageSize({ width: img.width, height: img.height });
        };
        img.src = URL.createObjectURL(selectedFile);
    }
  };

  const handleRecognize = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsLoading(true);
    try {
      const res = await api.post<RecognitionResponse>('/recognize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Recognition failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
      {/* Sidebar / Controls */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <ScanFace className="h-5 w-5" /> Recognition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
              <Upload 
                  value={file}
                  onFileSelect={handleFileSelect}
                  isLoading={isLoading}
                  label="Upload image to recognize"
                  className="min-h-37.5"
              />

              <Button
                  onClick={handleRecognize}
                  disabled={!file || isLoading}
                  className="w-full"
              >
                  {isLoading ? 'Scanning...' : 'Identify Faces'}
              </Button>
          </div>

          {result && (
              <div className="bg-muted/30 p-4 rounded-lg border border-border">
                  <h3 className="font-semibold mb-2 text-sm text-foreground">Results</h3>
                  <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">Found {result.faces.length} faces</p>
                      {result.faces.map((face, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-card p-2 rounded border border-border shadow-sm">
                              <span className={cn(
                                  "font-medium",
                                  face.person === 'Unknown' ? "text-muted-foreground" : "text-green-600 dark:text-green-400"
                              )}>
                                  {face.person}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                  {face.distance.toFixed(4)}
                              </span>
                          </div>
                      ))}
                  </div>
              </div>
          )}
        </CardContent>
      </Card>

      {/* Main View / Canvas */}
      <Card className="min-h-125 flex items-center justify-center relative overflow-hidden bg-muted/10">
        <CardContent className="p-6 w-full flex justify-center">
          {file ? (
             <div className="relative inline-block">
                <img 
                    src={file ? URL.createObjectURL(file) : undefined} 
                    alt="Target" 
                    className="max-h-150 w-auto block rounded-lg shadow-sm"
                />
                
                {/* Draw Bounding Boxes */}
                {result && result.faces.map((face, idx) => {
                    // We need to scale boxes if the image is displayed smaller than natural size
                    // However, implementing scaling logic in React relies into getting the displayed img dimensions.
                    // For simplicity, let's assume the box fits if we can map it to percentage or if we use relative positioning on a wrapper that matches actual image size.
                    // A better approach often used: render boxes based on the natural image size but scale them via CSS transform or SVG overlay.
                    
                    // Actually, simpler approach for this demo:
                    // The detected box is [x, y, w, h] in pixels relative to original image.
                    // We can put an SVG overlay on top of the image with viewBox = original width/height.
                    
                    if (!imageSize) return null;

                    return (
                        <div
                            key={idx}
                            className="absolute border-2 flex flex-col items-start"
                            style={{
                                left: `${(face.box[0] / imageSize.width) * 100}%`,
                                top: `${(face.box[1] / imageSize.height) * 100}%`,
                                width: `${(face.box[2] / imageSize.width) * 100}%`,
                                height: `${(face.box[3] / imageSize.height) * 100}%`,
                                borderColor: face.person === 'Unknown' ? 'red' : '#16a34a', // green-600
                            }}
                        >
                            <span 
                                className="text-xs text-white px-1 py-0.5 rounded shadow-sm -mt-6 whitespace-nowrap"
                                style={{ backgroundColor: face.person === 'Unknown' ? 'red' : '#16a34a'}}
                            >
                                {face.person} ({((1 - face.distance) * 100).toFixed(0)}%)
                            </span>
                        </div>
                    );
                })}
             </div>
        ) : (
            <div className="text-gray-400 flex flex-col items-center">
                <ScanFace className="h-16 w-16 mb-4 opacity-20" />
                <p>Upload an image to start recognition</p>
            </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
};
