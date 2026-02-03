import { PersonManager } from './components/PersonManager';
import { Recognition } from './components/Recognition';
import { Search as SearchComponent } from './components/Search';
import { ScanFace, Search, Users } from 'lucide-react';
import './App.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

const App = () => {
  return (
    <div className="min-h-screen bg-muted/40 text-foreground font-sans">
      <Tabs defaultValue="search" className="flex flex-col min-h-screen">
        <header className="bg-background border-b sticky top-0 z-10 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 min-h-12 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl text-primary">
              <ScanFace className="h-6 w-6" />
              <span>FaceSearch</span>
            </div>

            <TabsList>
              <TabsTrigger value="search">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  <div className="hidden sm:block">Search</div>
                </div>
              </TabsTrigger>
              <TabsTrigger value="recognize">
                <div className="flex items-center gap-2">
                <ScanFace className="h-4 w-4 mr-2" /> 
                <span className="hidden sm:block">Recognize</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="manage">
                <div className="flex items-center gap-2">
                <Users className="h-4 w-4 mr-2" /> 
                <span className="hidden sm:block">Manage</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>
        </header>

        <main className="max-w-5xl mx-auto p-2 w-full flex-1 md:p-4">
          <TabsContent value="search" className="m-0">
            <SearchComponent />
          </TabsContent>
          
          <TabsContent value="recognize" className="m-0">
            <Recognition />
          </TabsContent>
          
          <TabsContent value="manage" className="m-0">
            <PersonManager />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
};

export default App;
