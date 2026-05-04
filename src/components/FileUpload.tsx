import { useState, useRef } from 'react';
import { Upload, X, Loader2, FileText, Film, Image as ImageIcon, File as FileIcon } from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept: string;
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<string | null>;
  onRemove?: () => void;
  preview?: 'image' | 'none';
  previewClass?: string;
  hint?: string;
  multiple?: false;
}

interface MultiFileUploadProps {
  label: string;
  accept: string;
  files: UploadedFile[];
  onUpload: (file: File) => Promise<UploadedFile | null>;
  onRemove: (index: number) => void;
  hint?: string;
  multiple: true;
  maxFiles?: number;
}

export interface UploadedFile {
  url: string;
  name: string;
  type: string;
  size: number;
  /** Present when the file ya existe en la base de datos */
  dbId?: number;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (type.startsWith('video/')) return <Film className="w-5 h-5 text-rose-500" />;
  if (type === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
  return <FileIcon className="w-5 h-5 text-gray-500" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload(props: FileUploadProps | MultiFileUploadProps) {
  if (props.multiple) return <MultiUpload {...props} />;
  return <SingleUpload {...props} />;
}

function SingleUpload({ label, accept, currentUrl, onUpload, onRemove, preview = 'image', previewClass, hint }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const result = await onUpload(file);
    if (!result) setError('Error al subir archivo');
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>

      {currentUrl && preview === 'image' && (
        <div className={`relative mb-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 ${previewClass || 'h-40'}`}>
          <img src={currentUrl} alt="" className="w-full h-full object-cover" />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 bg-gray-50 dark:bg-gray-800/50 cursor-pointer transition-colors"
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        ) : (
          <Upload className="w-5 h-5 text-gray-400" />
        )}
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {uploading ? 'Subiendo...' : currentUrl ? 'Cambiar archivo' : 'Seleccionar archivo'}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

function MultiUpload({ label, accept, files, onUpload, onRemove, hint, maxFiles = 10 }: MultiFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setError('');

    const remaining = maxFiles - files.length;
    const toUpload = Array.from(selectedFiles).slice(0, remaining);

    for (const file of toUpload) {
      const result = await onUpload(file);
      if (!result) {
        setError(`Error al subir: ${file.name}`);
        break;
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const canAdd = files.length < maxFiles;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <span className="text-xs text-gray-400">{files.length}/{maxFiles}</span>
      </div>

      {files.length > 0 && (
        <div className="space-y-2 mb-3">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {file.type.startsWith('image/') ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                  <img src={file.url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 bg-gray-50 dark:bg-gray-800/50 cursor-pointer transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          ) : (
            <Upload className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {uploading ? 'Subiendo...' : 'Agregar archivos'}
            </p>
            {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            onChange={handleChange}
            className="hidden"
          />
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}
