import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi, authApi } from '../services/api';
import { format } from 'date-fns';
import {
  Plus,
  Briefcase,
  User,
  Building2,
  DollarSign,
  Users,
  X,
  Trash2,
  Pin,
  Archive,
  RotateCcw,
  FileText,
  Save,
  Check,
  Share2,
  Eye,
  Link2,
  ExternalLink
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

// Helper to detect and render URLs as clickable links
function renderTextWithLinks(text: string) {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      try {
        const url = new URL(part);
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <Link2 size={11} className="flex-shrink-0" />
            <span className="break-all">{url.hostname}{url.pathname !== '/' ? url.pathname.substring(0, 20) + (url.pathname.length > 20 ? '...' : '') : ''}</span>
            <ExternalLink size={9} className="flex-shrink-0" />
          </a>
        );
      } catch {
        return part;
      }
    }
    return part;
  });
}

const CATEGORIES = [
  { id: 'personal', label: 'Personal', icon: User, color: 'bg-blue-100 text-blue-700' },
  { id: 'office', label: 'Office', icon: Briefcase, color: 'bg-purple-100 text-purple-700' },
  { id: 'family', label: 'Family', icon: Users, color: 'bg-green-100 text-green-700' },
  { id: 'business', label: 'Business', icon: Building2, color: 'bg-red-100 text-red-700' },
  { id: 'finance', label: 'Finance', icon: DollarSign, color: 'bg-yellow-100 text-yellow-700' },
];

export default function MyNotes() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes', selectedCategory],
    queryFn: () => notesApi.getAll(selectedCategory || undefined),
  });

  // Get family members for sharing
  const { data: family } = useQuery({
    queryKey: ['family'],
    queryFn: authApi.getFamily,
    enabled: user?.role === 'parent',
  });

  const createMutation = useMutation({
    mutationFn: notesApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setShowNewNoteModal(false);
      setSelectedNote(data);
      setEditTitle(data.title);
      setEditContent(data.content || '');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => notesApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setSelectedNote(data);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setSelectedNote(null);
    },
  });

  const undoMutation = useMutation({
    mutationFn: notesApi.undo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setSelectedNote(data);
      setEditContent(data.content || '');
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: notesApi.togglePin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: notesApi.toggleArchive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setSelectedNote(null);
    },
  });

  // Auto-save with debounce
  const saveNote = useCallback(() => {
    if (selectedNote && hasUnsavedChanges) {
      updateMutation.mutate({
        id: selectedNote.id,
        data: {
          title: editTitle,
          content: editContent,
        },
      });
    }
  }, [selectedNote, hasUnsavedChanges, editTitle, editContent]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      saveNote();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [editTitle, editContent, hasUnsavedChanges, saveNote]);

  const handleSelectNote = (note: any) => {
    if (hasUnsavedChanges && selectedNote) {
      saveNote();
    }
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content || '');
    setHasUnsavedChanges(false);
    setLastSaved(null);
  };

  const handleTitleChange = (value: string) => {
    setEditTitle(value);
    setHasUnsavedChanges(true);
  };

  const handleContentChange = (value: string) => {
    setEditContent(value);
    setHasUnsavedChanges(true);
  };

  const handleDeleteNote = (noteId: number) => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteMutation.mutate(noteId);
    }
  };

  const handleUndo = () => {
    if (selectedNote?.content_previous) {
      undoMutation.mutate(selectedNote.id);
    }
  };

  const handleManualSave = () => {
    if (selectedNote) {
      updateMutation.mutate({
        id: selectedNote.id,
        data: {
          title: editTitle,
          content: editContent,
        },
      });
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat?.icon || FileText;
  };

  // Sort notes: pinned first
  const sortedNotes = notes?.slice().sort((a: any, b: any) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <div className="h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Notes</h1>
        <button
          onClick={() => setShowNewNoteModal(true)}
          className="flex items-center gap-2 bg-islamic-green text-white px-4 py-2 rounded-lg hover:bg-teal-700"
        >
          <Plus size={18} />
          New Note
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            selectedCategory === null
              ? 'bg-islamic-green text-white'
              : 'bg-white shadow-sm hover:shadow-md'
          }`}
        >
          All Notes
        </button>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-islamic-green text-white'
                  : 'bg-white shadow-sm hover:shadow-md'
              }`}
            >
              <Icon size={16} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="flex gap-4 h-[calc(100%-120px)]">
        {/* Note List */}
        <div className="w-1/3 min-w-[250px] max-w-[350px] bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b bg-gray-50 font-medium text-sm text-gray-600">
            {sortedNotes?.length || 0} Notes
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-400">Loading...</div>
            ) : sortedNotes?.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No notes yet. Create your first note!
              </div>
            ) : (
              sortedNotes?.map((note: any) => {
                const Icon = getCategoryIcon(note.category);
                const isSelected = selectedNote?.id === note.id;
                const isSharedWithMe = !note.is_owner;
                const isSharedWithOthers = note.is_owner && note.shared_with?.length > 0;
                return (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition ${
                      isSelected ? 'bg-teal-50 border-l-4 border-l-islamic-green' : ''
                    } ${isSharedWithMe ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {note.is_pinned && (
                        <Pin size={14} className="text-amber-500 mt-1 flex-shrink-0" />
                      )}
                      {isSharedWithMe && (
                        <span title="Shared with you">
                          <Eye size={14} className="text-blue-500 mt-1 flex-shrink-0" />
                        </span>
                      )}
                      {isSharedWithOthers && (
                        <span title="Shared">
                          <Share2 size={14} className="text-green-500 mt-1 flex-shrink-0" />
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{note.title}</h3>
                        {isSharedWithMe && note.owner_name && (
                          <p className="text-xs text-blue-600 mt-0.5">by {note.owner_name}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {renderTextWithLinks(note.content?.substring(0, 100) || 'No content')}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <Icon size={12} />
                          <span>{format(new Date(note.updated_at), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Note Editor */}
        <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
          {selectedNote ? (
            <>
              {/* Editor Header */}
              <div className="p-3 border-b flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedNote.category}
                    onChange={(e) => {
                      updateMutation.mutate({
                        id: selectedNote.id,
                        data: { category: e.target.value },
                      });
                    }}
                    className="text-sm px-2 py-1 border rounded bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  {selectedNote.content_previous && (
                    <button
                      onClick={handleUndo}
                      className="p-2 hover:bg-gray-200 rounded text-gray-600"
                      title="Undo last edit"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                  {selectedNote.is_owner && user?.role === 'parent' && (
                    <button
                      onClick={() => setShowShareModal(true)}
                      className={`p-2 hover:bg-gray-200 rounded ${
                        selectedNote.shared_with?.length > 0 ? 'text-green-500' : 'text-gray-600'
                      }`}
                      title="Share with family"
                    >
                      <Share2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => togglePinMutation.mutate(selectedNote.id)}
                    className={`p-2 hover:bg-gray-200 rounded ${
                      selectedNote.is_pinned ? 'text-amber-500' : 'text-gray-600'
                    }`}
                    title={selectedNote.is_pinned ? 'Unpin' : 'Pin to top'}
                  >
                    <Pin size={16} />
                  </button>
                  <button
                    onClick={() => toggleArchiveMutation.mutate(selectedNote.id)}
                    className="p-2 hover:bg-gray-200 rounded text-gray-600"
                    title="Archive"
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    className="p-2 hover:bg-red-100 rounded text-red-600"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 p-4 flex flex-col">
                {!selectedNote.is_owner && (
                  <div className="mb-3 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg flex items-center gap-2">
                    <Eye size={16} />
                    <span>Shared by {selectedNote.owner_name} - Read only</span>
                  </div>
                )}
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Note title..."
                  className="text-xl font-semibold border-none outline-none mb-4 w-full"
                  readOnly={!selectedNote.is_owner}
                />
                {!selectedNote.is_owner ? (
                  // Read-only: render with clickable URLs
                  <div className="flex-1 text-gray-700 leading-relaxed whitespace-pre-wrap overflow-y-auto bg-gray-50 p-2 rounded">
                    {renderTextWithLinks(editContent) || <span className="text-gray-400">No content</span>}
                  </div>
                ) : (
                  // Editable: keep textarea
                  <textarea
                    value={editContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Start writing your note..."
                    className="flex-1 resize-none border-none outline-none text-gray-700 leading-relaxed"
                  />
                )}
              </div>

              {/* Editor Footer */}
              <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <div>
                  {!selectedNote.is_owner ? (
                    <span className="text-blue-600">Viewing shared note</span>
                  ) : hasUnsavedChanges ? (
                    <span className="text-amber-600">Unsaved changes</span>
                  ) : lastSaved ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check size={12} /> Saved at {format(lastSaved, 'h:mm a')}
                    </span>
                  ) : (
                    <span>Last updated: {format(new Date(selectedNote.updated_at), 'MMM d, h:mm a')}</span>
                  )}
                </div>
                {selectedNote.is_owner && (
                  <button
                    onClick={handleManualSave}
                    disabled={!hasUnsavedChanges || updateMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1 bg-islamic-green text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={14} />
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a note to view or edit</p>
                <p className="text-sm mt-2">or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Note Modal */}
      {showNewNoteModal && (
        <NewNoteModal
          onClose={() => setShowNewNoteModal(false)}
          onCreate={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
          defaultCategory={selectedCategory || 'personal'}
        />
      )}

      {/* Share Note Modal */}
      {showShareModal && selectedNote && family && (
        <ShareNoteModal
          note={selectedNote}
          family={family}
          onClose={() => setShowShareModal(false)}
          onShare={(sharedWith) => {
            updateMutation.mutate({
              id: selectedNote.id,
              data: { shared_with: sharedWith },
            });
            setShowShareModal(false);
          }}
        />
      )}
    </div>
  );
}

function NewNoteModal({
  onClose,
  onCreate,
  isPending,
  defaultCategory,
}: {
  onClose: () => void;
  onCreate: (data: { title: string; content?: string; category: string }) => void;
  isPending: boolean;
  defaultCategory: string;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(defaultCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({ title: title.trim(), category });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">New Note</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full px-3 py-2 border rounded-lg"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="w-full py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {isPending ? 'Creating...' : 'Create Note'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ShareNoteModal({
  note,
  family,
  onClose,
  onShare,
}: {
  note: any;
  family: any[];
  onClose: () => void;
  onShare: (sharedWith: number[]) => void;
}) {
  const [selectedMembers, setSelectedMembers] = useState<number[]>(note.shared_with || []);

  const toggleMember = (userId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onShare(selectedMembers);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Share2 size={18} />
            Share Note
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Select family members to share "{note.title}" with:
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {family.filter(m => m.id !== note.user_id).map((member) => (
              <label
                key={member.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  selectedMembers.includes(member.id)
                    ? 'border-islamic-green bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                  className="w-4 h-4 text-islamic-green rounded"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{member.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                </div>
                {selectedMembers.includes(member.id) && (
                  <Eye size={16} className="text-islamic-green" />
                )}
              </label>
            ))}
          </div>

          {family.filter(m => m.id !== note.user_id).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No other family members to share with.
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700"
            >
              {selectedMembers.length === 0 ? 'Remove Sharing' : `Share with ${selectedMembers.length}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
