import React, { useEffect, useState } from 'react';
import { api } from '../api/api';
import { Upload } from './Upload';
import { Trash2, UserPlus, Upload as UploadIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Person {
  id: string;
  name: string;
  created_at: string;
  face_count: number;
}

export const PersonManager: React.FC = () => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPersons = async () => {
    try {
      const res = await api.get<Person[]>('/persons');
      setPersons(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    try {
      const res = await api.post('/persons', { name: newPersonName });
      setPersons([...persons, res.data]);
      setNewPersonName('');
    } catch (err) {
      alert('Failed to create person');
    }
  };

  const handleDeletePerson = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/persons/${id}`);
      setPersons(persons.filter(p => p.id !== id));
      if (selectedPerson?.id === id) setSelectedPerson(null);
    } catch (err) {
      alert('Failed to delete person');
    }
  };

  const handleUploadSample = async () => {
    if (!selectedPerson || !uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);

    setIsLoading(true);
    try {
      await api.post(`/persons/${selectedPerson.id}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Image uploaded and face encoded successfully!');
      setUploadFile(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* List & Create */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Manage Persons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreatePerson} className="flex gap-2 mb-6">
            <Input
              type="text"
              placeholder="Enter name (e.g., Elon Musk)"
              value={newPersonName}
              onChange={e => setNewPersonName(e.target.value)}
            />
            <Button type="submit">
              Add
            </Button>
          </form>

          <div className="space-y-2 max-h-100 overflow-y-auto">
            {persons.map(person => (
              <div 
                key={person.id} 
                className={cn(
                  "flex justify-between items-center p-3 rounded-md border cursor-pointer hover:bg-accent/50 transition-colors",
                  selectedPerson?.id === person.id ? "border-primary/50 bg-accent" : "border-border"
                )}
                onClick={() => setSelectedPerson(person)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{person.name}</span>
                  {person.face_count > 0 ? (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePerson(person.id);
                  }}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {persons.length === 0 && (
              <p className="text-muted-foreground text-center py-4 text-sm">No persons yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Sample */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="h-5 w-5" /> Upload Sample
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedPerson ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a clear face image for <span className="font-bold text-foreground">{selectedPerson.name}</span>.
              </p>
              
              <Upload 
                value={uploadFile}
                onFileSelect={setUploadFile}
                isLoading={isLoading}
                label="Drop face image here"
              />

              <Button
                onClick={handleUploadSample}
                disabled={!uploadFile || isLoading}
                className="w-full"
              >
                {isLoading ? 'Processing...' : 'Upload & Train'}
              </Button>
            </div>
          ) : (
            <div className="h-50 flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <p className="text-sm">Select a person to upload samples</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
