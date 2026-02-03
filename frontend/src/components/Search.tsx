import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, ChevronLeft, ChevronRight, X, ZoomIn, Search as SearchIcon, Grid2X2, Grid3X3, Square } from 'lucide-react';
import { BatchUpload } from './BatchUpload';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { client } from '../api/client';
import type { ImageResult } from '../api/face-search.api';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';
import { keepPreviousData } from '@tanstack/react-query';

const FaceBoxOverlay: React.FC<{ 
  faces: any[], 
  naturalWidth: number, 
  naturalHeight: number,
  onFaceClick?: (face: any) => void 
}> = ({ faces, naturalWidth, naturalHeight, onFaceClick }) => {
  if (!naturalWidth || !naturalHeight) return null;
  
  return (
    <div className="absolute inset-0">
      {faces.map((face, i) => {
         if (!face.box) return null;
         const [x1, y1, x2, y2] = face.box;
         const isKnown = !!face.person_name;
         
         return (
           <div
             key={i}
             onClick={(e) => {
               e.stopPropagation();
               if (!isKnown && onFaceClick) onFaceClick(face);
             }}
             className={cn(
                "absolute border-2 rounded-sm transition-all cursor-pointer",
                isKnown 
                  ? "border-yellow-400 opacity-0 hover:opacity-100" 
                  : "border-dashed border-red-500/70 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500 hover:opacity-100"
             )}
             style={{
               left: `${(x1 / naturalWidth) * 100}%`,
               top: `${(y1 / naturalHeight) * 100}%`,
               width: `${((x2 - x1) / naturalWidth) * 100}%`,
               height: `${((y2 - y1) / naturalHeight) * 100}%`,
             }}
             title={isKnown ? face.person_name : "Unknown - Click to name"}
           >
             {isKnown ? (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-10">
                  {face.person_name}
                </div>
             ) : (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-10 opacity-0 hover:opacity-100">
                  Name this person
                </div>
             )}
           </div>
         );
      })}
    </div>
  );
};

const SearchResultItem: React.FC<{ 
  img: ImageResult; 
  getImageUrl: (path: string) => string;
  onClick: () => void;
}> = ({ img, getImageUrl, onClick }) => {
  return (
    <div 
      className="aspect-square relative group overflow-hidden rounded-lg bg-muted border cursor-pointer"
      onClick={onClick}
    >
      <div className="relative w-full h-full flex items-center justify-center bg-black/5">
        <img 
          src={getImageUrl(img.file_path)} 
          alt="Result" 
          loading="lazy"
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      </div>

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pointer-events-none">
          <div className="text-white w-full">
            <p className="text-xs truncate opacity-80">{new Date(img.created_at).toLocaleDateString()}</p>
            <ZoomIn className="w-4 h-4 absolute top-2 right-2 opacity-80" />
          </div>
      </div>
    </div>
  );
};

enum Size {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export const Search: React.FC = () => {
  const [page, setPage] = useState(1);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lightboxDims, setLightboxDims] = useState<{w: number, h: number} | null>(null);
  const [gridCols, setGridCols] = useState(Size.MEDIUM);
  
  // New Person Creation State
  const [selectedFace, setSelectedFace] = useState<{ id: string } | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);
  
  const { mutate } = client.from('faceSearch').useCreatePersonFromFace(); // Access API class directly if possible or just instantiation

  const handleCreatePerson = async () => {
     if (!selectedFace || !newPersonName.trim()) return;
     
     setIsCreatingPerson(true);
     try {

         mutate({
             name: newPersonName,
             face_id: selectedFace.id
         });
         
         setSelectedFace(null);
         setNewPersonName('');
         // Maybe show success toast
     } catch (err) {
         console.error(err);
         alert('Failed to create person. Name may already exist.');
     } finally {
         setIsCreatingPerson(false);
     }
  };

  // Debounce for image search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(inputValue);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [inputValue]);

  // Use generated hooks
  // Switch to searchImagesByName
  const { data: searchData, isLoading } = client.from('faceSearch').useSearchImagesByName({
    page,
    size: 60,
    name: debouncedSearch
  }, {
    placeholderData: keepPreviousData
  });

  const images = searchData?.items || [];
  const totalPages = searchData?.pages || 1;
  const totalItems = searchData?.total || 0;

  const lightboxImage = lightboxIndex >= 0 && images[lightboxIndex] ? images[lightboxIndex] : null;

  // Reset overlay dims when changing image
  useEffect(() => {
    setLightboxDims(null);
  }, [lightboxIndex]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxImage) return;
      if (e.key === 'ArrowRight') setLightboxIndex(i => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setLightboxIndex(i => (i - 1 + images.length) % images.length);
      if (e.key === 'Escape') setLightboxIndex(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, images.length]);

  // Helper to convert backend file path to accessible URL
  const getImageUrl = (filePath: string) => {
    const filename = filePath.split(/[/\\]/).pop();
    const baseUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';
    return `${baseUrl}/static/${filename}`;
  };

  return (
    <div>
      {/* Results Grid */}
      <Card className="min-h-125 flex flex-col">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between space-y-0">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
             <SearchIcon className="h-5 w-5" /> 
             {debouncedSearch ? `Results for "${debouncedSearch}"` : 'All Photos'}
             <span className="text-sm font-normal text-muted-foreground ml-2">({totalItems} items)</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search person..."
                className="pl-9"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            
            <BatchUpload onUploadComplete={() => {}} />

            <Tabs value={gridCols} onValueChange={val => setGridCols(val as Size)} >
              <TabsList>
                <TabsTrigger value={Size.LARGE}>
                  <Square />
                </TabsTrigger>
                <TabsTrigger value={Size.MEDIUM}>
                  <Grid2X2 />
                </TabsTrigger>
                <TabsTrigger value={Size.SMALL}>
                  <Grid3X3 />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-40 text-muted-foreground">Loading...</div>
          ) : (
            images.length > 0 ? (
              <div className={cn(
                "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
                gridCols === Size.SMALL && "md:grid-cols-4 lg:grid-cols-6",
                gridCols === Size.LARGE && "md:grid-cols-2 lg:grid-cols-3"
              )}>
              {images.map((img, idx) => (
                <SearchResultItem 
                  key={img.id} 
                  img={img} 
                  getImageUrl={getImageUrl} 
                  onClick={() => setLightboxIndex(idx)} 
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
              <p>No photos found.</p>
              <p className="text-sm mt-2 opacity-70">Try selecting a different person or uploading new photos.</p>
            </div>
          ))}
        </CardContent>

        {/* Pagination */
        totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 p-6 pt-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* Lightbox / Gallery View */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setLightboxIndex(-1)}>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4 z-50"
              onClick={() => setLightboxIndex(-1)}
            >
              <X className="w-6 h-6" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="absolute left-4 z-50 hidden md:flex"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + images.length) % images.length); }}
            >
              <ChevronLeft className="w-12 h-12" />
            </Button>
            
            <div className="relative max-w-5xl max-h-screen w-full flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <img 
                  src={getImageUrl(lightboxImage.file_path)} 
                  alt="Full size" 
                  className="max-h-[85vh] max-w-full object-contain rounded-md shadow-2xl block"
                  onLoad={(e) => setLightboxDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                />
                {lightboxDims && (
                  <FaceBoxOverlay 
                    faces={lightboxImage.faces} 
                    naturalWidth={lightboxDims.w} 
                    naturalHeight={lightboxDims.h}
                    onFaceClick={(face) => {
                      setSelectedFace(face);
                      setNewPersonName('');
                    }}
                  />
                )}
              </div>
              
              <div className="absolute -bottom-12 text-center text-black/80">
                {lightboxIndex + 1} / {images.length}
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 z-50 hidden md:flex"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % images.length); }}
            >
              <ChevronRight className="w-12 h-12" />
            </Button>
        </div>
      )}

      {/* New Person Modal */}
      {selectedFace && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedFace(null)}>
          <div className="bg-background p-6 rounded-lg shadow-2xl w-96 border animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Name this person</h3>
            <p className="text-sm text-muted-foreground mb-4">
                Create a new person for this face. The system will also search for and update other similar unknown faces.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Create New Person
                </label>
                <Input 
                  autoFocus 
                  placeholder="Enter full name..." 
                  defaultValue={newPersonName} 
                  onChange={e => setNewPersonName(e.target.value)} 
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setSelectedFace(null)}>Cancel</Button>
              <Button onClick={handleCreatePerson} disabled={!newPersonName.trim() || isCreatingPerson}>
                {isCreatingPerson ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Processing...
                  </>
                ) : 'Create & Auto-merge'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
