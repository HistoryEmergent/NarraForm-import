import { useState } from "react";
import { LLMProvider } from "@/utils/llmApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContentTypeDialog } from "./ContentTypeDialog";
import { parseFile } from "@/utils/fileParser";

interface FileImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (parsedContent: any, initialMedium: 'novel' | 'screenplay', outputMedium: string, fileName: string, createNewProject?: boolean, provider?: LLMProvider) => void;
  hasCurrentProject?: boolean;
}

export function FileImportDialog({ open, onOpenChange, onImport, hasCurrentProject = false }: FileImportDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showContentTypeDialog, setShowContentTypeDialog] = useState(false);
  const [showProjectOptionDialog, setShowProjectOptionDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const supportedFormats = ['.txt', '.rtf', '.doc', '.docx', '.pages', '.fdx', '.epub'];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    console.log('FileImportDialog: Attempting to handle file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    console.log('FileImportDialog: Detected extension:', extension);
    
    if (!supportedFormats.includes(extension)) {
      console.error('FileImportDialog: Unsupported format detected:', extension);
      toast({
        title: "Unsupported file format",
        description: `Please select a file with one of these formats: ${supportedFormats.join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    console.log('FileImportDialog: File format supported, proceeding with:', extension);

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    if (hasCurrentProject) {
      setShowProjectOptionDialog(true);
    } else {
      setShowContentTypeDialog(true);
    }
  };

  const handleProjectOptionSelect = (createNew: boolean) => {
    setShowProjectOptionDialog(false);
    setShowContentTypeDialog(true);
  };

  const handleContentTypeSelect = async (initialMedium: 'novel' | 'screenplay', outputMedium: 'audio_drama' | 'novel' | 'screenplay' | 'podcast_script' | 'radio_drama', provider?: LLMProvider) => {
    if (!selectedFile) return;
    
    setShowContentTypeDialog(false);
    setIsProcessing(true);

    try {
      const parsedContent = await parseFile(selectedFile, initialMedium);
      const createNewProject = !hasCurrentProject;
      onImport(parsedContent, initialMedium, outputMedium, selectedFile.name, createNewProject, provider);
      
      toast({
        title: "File imported successfully",
        description: `${selectedFile.name} has been processed into ${parsedContent.sections.length} ${initialMedium === 'novel' ? 'chapter(s)' : 'scene(s)'}.`
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "Import failed", 
        description: error instanceof Error ? error.message : "There was an error processing your file.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setSelectedFile(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Novel or Screenplay
          </DialogTitle>
          <DialogDescription>
            Upload your manuscript to convert it into an audiodrama script, or create a new project if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!hasCurrentProject && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 mb-1">No Project Selected</p>
                  <p className="text-blue-700">
                    You can still import your file - it will be used to create a new project automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Drag and Drop Area */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive 
                ? 'border-primary bg-primary/10' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }
              ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileText className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-2">
              {isProcessing ? 'Processing file...' : 
               'Drag and drop your file here, or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Supports: {supportedFormats.join(', ')}
            </p>
            
            <Input
              type="file"
              accept=".txt,.rtf,.doc,.docx,.pages,.fdx,.epub,text/plain,application/rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/xml,text/xml,application/epub+zip"
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />
            
            <Button variant="outline" size="sm" disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Choose File'}
            </Button>
          </div>

          {/* Format Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Processing Information</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Novels will be split by chapters</li>
                  <li>• Screenplays will be split by scenes</li>
                  <li>• Maximum file size: 10MB</li>
                  <li>• AI processing uses Google Gemini 2.5</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      <ContentTypeDialog 
        open={showContentTypeDialog}
        onOpenChange={setShowContentTypeDialog}
        onSelect={handleContentTypeSelect}
        fileName={selectedFile?.name || ''}
      />

      <Dialog open={showProjectOptionDialog} onOpenChange={setShowProjectOptionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Options</DialogTitle>
            <DialogDescription>
              Do you want to add this file to the current project or create a new project?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Button onClick={() => handleProjectOptionSelect(false)} variant="outline">
              Add to Current Project
            </Button>
            <Button onClick={() => handleProjectOptionSelect(true)}>
              Create New Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}