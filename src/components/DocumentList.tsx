// React import removed
import { ProjectDocument } from '../types';
import { Button } from './ui/Button';
import { FileText, Download, Trash2, Upload, FileImage } from 'lucide-react';

interface DocumentListProps {
    documents: ProjectDocument[];
    onUpload: () => void;
    onDelete: (id: string) => void;
}

export default function DocumentList({ documents, onUpload, onDelete }: DocumentListProps) {

    const getIcon = (type: string) => {
        if (type.includes('image')) return <FileImage className="w-8 h-8 text-purple-500" />;
        if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
        return <FileText className="w-8 h-8 text-slate-500" />;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-slate-900">Documentación</h3>
                <Button size="sm" onClick={onUpload}>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Archivo
                </Button>
            </div>

            {documents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p>No hay documentos subidos.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {documents.map(doc => (
                        <div
                            key={doc.id}
                            className="group relative flex items-start gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-primary-200 hover:shadow-sm transition-all"
                        >
                            <div className="p-2 bg-slate-50 rounded-lg">
                                {getIcon(doc.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate" title={doc.name}>{doc.name}</p>
                                <p className="text-xs text-slate-500 mt-1">{doc.category} • {doc.size} • {new Date(doc.uploadDate).toLocaleDateString()}</p>
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white shadow-sm rounded-md border border-slate-100">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Descargar">
                                    <Download className="w-4 h-4 text-slate-500" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-red-500" onClick={() => onDelete(doc.id)} title="Eliminar">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
