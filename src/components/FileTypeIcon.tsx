import type { LucideProps } from 'lucide-react';
import { Archive, File, FileImage, FileSpreadsheet, FileText, Film, Headphones, Presentation } from 'lucide-react';

type FileTypeIconProps = {
  fileName: string;
  fileType?: string;
  className?: string;
  size?: LucideProps['size'];
};

/** Icono según extensión o MIME para listas de archivos. */
export default function FileTypeIcon({ fileName, fileType, className, size = 18 }: FileTypeIconProps) {
  const ext = (fileName.includes('.') ? fileName.split('.').pop() : '')?.toLowerCase() || '';
  const mime = (fileType || '').toLowerCase();

  const common = 'flex-shrink-0 text-gray-500 dark:text-gray-400 ' + (className || '');

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return <FileImage className={common} size={size} aria-hidden />;
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
    return <Film className={common} size={size} aria-hidden />;
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return <Headphones className={common} size={size} aria-hidden />;
  }
  if (['pdf'].includes(ext) || mime === 'application/pdf') {
    return <FileText className={common + ' text-red-500 dark:text-red-400'} size={size} aria-hidden />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mime.includes('zip') || mime.includes('compressed')) {
    return <Archive className={common} size={size} aria-hidden />;
  }
  if (['doc', 'docx', 'odt'].includes(ext) || mime.includes('word')) {
    return <FileText className={common + ' text-blue-500 dark:text-blue-400'} size={size} aria-hidden />;
  }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mime.includes('sheet') || mime.includes('excel')) {
    return <FileSpreadsheet className={common + ' text-emerald-500 dark:text-emerald-400'} size={size} aria-hidden />;
  }
  if (['ppt', 'pptx', 'odp'].includes(ext) || mime.includes('presentation')) {
    return <Presentation className={common + ' text-orange-500 dark:text-orange-400'} size={size} aria-hidden />;
  }

  return <File className={common} size={size} aria-hidden />;
}
